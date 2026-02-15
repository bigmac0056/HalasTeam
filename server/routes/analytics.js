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
    const periodDays = Number(req.query.periodDays || 30);
    const devices = await getAllDevices(req.user.id);
    const activeDevices = devices.filter(device => device.status);
    const energyRecords = await getEnergyConsumptionByUserId(req.user.id);

    const now = Date.now();
    const periodMs = periodDays > 0 ? periodDays * 24 * 60 * 60 * 1000 : null;
    const filteredEnergyRecords = periodMs
      ? energyRecords.filter((record) => {
          const ts = new Date(record.timestamp).getTime();
          return now - ts <= periodMs;
        })
      : energyRecords;

    // Расчет общего энергопотребления
    const totalEnergyConsumption = filteredEnergyRecords.reduce(
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
        recommendations = await getRecommendations(req.user.id, weatherData);
      } catch (error) {
        // Если не удалось получить погоду, используем рекомендации без погоды
        recommendations = await getRecommendations(req.user.id);
      }
    } else {
      recommendations = await getRecommendations(req.user.id);
    }

    res.json({
      analytics: {
        totalDevices: devices.length,
        activeDevices: activeDevices.length,
        inactiveDevices: devices.length - activeDevices.length,
        totalEnergyConsumption,
        roomStats,
        typeStats,
        periodDays,
        recentActivity: filteredEnergyRecords.slice(0, 30).reverse()
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
