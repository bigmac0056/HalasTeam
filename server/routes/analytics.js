const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getAllDevices, getEnergyConsumptionByUserId } = require('../state');
const { getRecommendations } = require('../services/recommendationService');
const { getWeather } = require('../services/weatherService');


router.use(authMiddleware);


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


    const totalEnergyConsumption = filteredEnergyRecords.reduce(
      (sum, record) => sum + (record.energyConsumed || 0),
      0
    );


    let comparison = null;
    if (periodMs) {
      const currentPeriodStartTs = now - periodMs;
      const previousPeriodStartTs = now - periodMs * 2;

      const previousEnergyRecords = energyRecords.filter((record) => {
        const ts = new Date(record.timestamp).getTime();
        return ts >= previousPeriodStartTs && ts < currentPeriodStartTs;
      });

      const previousConsumption = previousEnergyRecords.reduce(
        (sum, record) => sum + (record.energyConsumed || 0),
        0
      );

      const deltaKwh = totalEnergyConsumption - previousConsumption;
      comparison = {
        currentKwh: totalEnergyConsumption,
        previousKwh: previousConsumption,
        deltaKwh,
        deltaPercent: previousConsumption > 0 ? (deltaKwh / previousConsumption) * 100 : null
      };
    }


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


    const deviceById = new Map(devices.map((device) => [device.id, device]));
    const deviceByName = new Map(devices.map((device) => [device.name, device]));
    const roomConsumption = {};
    filteredEnergyRecords.forEach((record) => {
      const linkedDevice = deviceById.get(record.deviceId) || deviceByName.get(record.deviceName);
      const roomName = linkedDevice?.room || 'Не указано';
      roomConsumption[roomName] = (roomConsumption[roomName] || 0) + Number(record.energyConsumed || 0);
    });


    let recommendations = [];
    const { lat, lon } = req.query;
    
    if (lat && lon) {
      try {
        const weatherData = await getWeather(parseFloat(lat), parseFloat(lon));
        recommendations = await getRecommendations(req.user.id, weatherData);
      } catch (error) {

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
        roomConsumption,
        typeStats,
        comparison,
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
