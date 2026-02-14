const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getAllDevices, getEnergyConsumptionByUserId } = require('../state');
const { getRecommendations } = require('../services/recommendationService');
const { getWeather } = require('../services/weatherService');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

// Получить аналитику
router.get('/', async (req, res) => {
  try {
    const devices = getAllDevices(req.user.id);
    const activeDevices = devices.filter(device => device.status);
    const energyRecords = getEnergyConsumptionByUserId(req.user.id);

    // Расчет общего энергопотребления
    const totalEnergyConsumption = energyRecords.reduce(
      (sum, record) => sum + (record.energyConsumed || 0),
      0
    );

    // Статистика по комнатам
    const roomStats = {};
    devices.forEach(device => {
      if (!roomStats[device.room]) {
        roomStats[device.room] = {
          total: 0,
          active: 0
        };
      }
      roomStats[device.room].total++;
      if (device.status) {
        roomStats[device.room].active++;
      }
    });

    // Статистика по типам устройств
    const typeStats = {};
    devices.forEach(device => {
      if (!typeStats[device.type]) {
        typeStats[device.type] = {
          total: 0,
          active: 0
        };
      }
      typeStats[device.type].total++;
      if (device.status) {
        typeStats[device.type].active++;
      }
    });

    // Получение рекомендаций (опционально с погодой)
    let recommendations = [];
    const { lat, lon } = req.query;
    
    if (lat && lon) {
      try {
        const weatherData = await getWeather(parseFloat(lat), parseFloat(lon));
        recommendations = getRecommendations(req.user.id, weatherData);
      } catch (error) {
        // Если не удалось получить погоду, используем рекомендации без погоды
        recommendations = getRecommendations(req.user.id);
      }
    } else {
      recommendations = getRecommendations(req.user.id);
    }

    res.json({
      analytics: {
        totalDevices: devices.length,
        activeDevices: activeDevices.length,
        inactiveDevices: devices.length - activeDevices.length,
        totalEnergyConsumption,
        roomStats,
        typeStats,
        recentActivity: energyRecords.slice(-10).reverse() // Последние 10 записей
      },
      recommendations
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка при получении аналитики',
      message: error.message 
    });
  }
});

module.exports = router;
