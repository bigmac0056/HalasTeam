const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAllDevices,
  addDevice,
  findDeviceById,
  updateDevice,
  addEnergyConsumption
} = require('../state');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

// Получить все устройства пользователя
router.get('/', (req, res) => {
  try {
    const devices = getAllDevices(req.user.id);
    res.json({
      devices,
      count: devices.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении устройств' });
  }
});

// Добавить новое устройство
router.post('/add', (req, res) => {
  try {
    const { name, room, type, source } = req.body;

    if (!name || !room || !type) {
      return res.status(400).json({ error: 'Поля name, room и type обязательны' });
    }

    const device = addDevice({
      userId: req.user.id,
      name,
      room,
      type,
      source: source || 'Unknown',
      status: false // По умолчанию выключено
    });

    res.status(201).json({
      message: 'Устройство успешно добавлено',
      device
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при добавлении устройства' });
  }
});

// Переключить статус устройства
router.post('/toggle', (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId обязателен' });
    }

    const device = findDeviceById(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    // Переключение статуса
    const newStatus = !device.status;
    updateDevice(deviceId, req.user.id, { status: newStatus });

    // Запись энергопотребления
    addEnergyConsumption({
      userId: req.user.id,
      deviceId: device.id,
      deviceName: device.name,
      action: newStatus ? 'on' : 'off',
      energyConsumed: newStatus ? 1 : 0 // Упрощенная модель
    });

    res.json({
      message: `Устройство ${newStatus ? 'включено' : 'выключено'}`,
      device: findDeviceById(deviceId, req.user.id)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при переключении устройства' });
  }
});

module.exports = router;
