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
router.get('/', async (req, res) => {
  try {
    const devices = await getAllDevices(req.user.id);
    res.json({
      devices,
      count: devices.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении устройств' });
  }
});

// Добавить новое устройство
router.post('/add', async (req, res) => {
  try {
    const { name, room, type, source } = req.body;

    if (!name || !room || !type) {
      return res.status(400).json({ error: 'Поля name, room и type обязательны' });
    }

    const device = await addDevice({
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
router.post('/toggle', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId обязателен' });
    }

    const device = await findDeviceById(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    // Переключение статуса
    const newStatus = !device.status;
    await updateDevice(deviceId, req.user.id, { status: newStatus });

    // Запись энергопотребления
    await addEnergyConsumption({
      userId: req.user.id,
      deviceId: device.id,
      deviceName: device.name,
      action: newStatus ? 'on' : 'off',
      energyConsumed: newStatus ? 1 : 0 // Упрощенная модель
    });

    const updatedDevice = await findDeviceById(deviceId, req.user.id);
    res.json({
      message: `Устройство ${newStatus ? 'включено' : 'выключено'}`,
      device: updatedDevice
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при переключении устройства' });
  }
});

// Обновить яркость устройства
router.put('/:deviceId/brightness', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { brightness } = req.body;

    if (brightness === undefined || brightness < 0 || brightness > 100) {
      return res.status(400).json({ error: 'Яркость должна быть от 0 до 100' });
    }

    const device = await findDeviceById(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    if (device.type !== 'Light') {
      return res.status(400).json({ error: 'Яркость можно изменить только для устройств типа Light' });
    }

    const updatedDevice = await updateDevice(deviceId, req.user.id, { brightness: parseInt(brightness) });

    res.json({
      message: 'Яркость обновлена',
      device: updatedDevice
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении яркости' });
  }
});

module.exports = router;
