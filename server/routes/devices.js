const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  prisma,
  getAllDevices,
  addDevice,
  findDeviceById,
  updateDevice,
  addEnergyConsumption,
  deleteDevice
} = require('../state');

const isSpeakerDevice = (device) => {
  if (!device) return false;
  const name = String(device.name || '').toLowerCase();
  return device.type === 'Speaker' || (device.type === 'Socket' && (name.includes('speaker') || name.includes('колон')));
};

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
    const { name, room, type, source, sensorType } = req.body;

    if (!name || !room || !type) {
      return res.status(400).json({ error: 'Поля name, room и type обязательны' });
    }

    const device = await addDevice({
      userId: req.user.id,
      name,
      room,
      type,
      source: source || 'Unknown',
      sensorType,
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

    if (!newStatus && isSpeakerDevice(device)) {
      const allDevices = await getAllDevices(req.user.id);
      const hasActiveSpeaker = allDevices.some((item) => isSpeakerDevice(item) && item.status);
      if (!hasActiveSpeaker) {
        await prisma.userPlaybackState.updateMany({
          where: { userId: req.user.id },
          data: { isPlaying: false }
        });
      }
    }

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

// Обновить значение устройства (температура и т.д.)
router.put('/:deviceId/value', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { value, unit } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Значение value обязательно' });
    }

    const device = await findDeviceById(deviceId, req.user.id);
    if (!device) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    const { updateDeviceValue } = require('../state');
    const updatedDevice = await updateDeviceValue(deviceId, req.user.id, value, unit);

    // Trigger Sensor Automation
    if (updatedDevice) {
      const { checkSensorRules } = require('../services/scheduler');
      await checkSensorRules(updatedDevice);
    }

    res.json({
      message: 'Значение обновлено',
      device: updatedDevice
    });
  } catch (error) {
    console.error('Error updating value:', error);
    res.status(500).json({ error: 'Ошибка при обновлении значения' });
  }
});

// Удалить устройство
router.delete('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const deleted = await deleteDevice(deviceId, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    res.json({ message: 'Устройство удалено' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении устройства' });
  }
});

module.exports = router;
