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
  deleteDevice,
  addAutomationLog,
  addNotification
} = require('../state');

const isSpeakerDevice = (device) => {
  if (!device) return false;
  const name = String(device.name || '').toLowerCase();
  return device.type === 'Speaker' || (device.type === 'Socket' && (name.includes('speaker') || name.includes('колон')));
};

const isHvacDevice = (device) => device?.type === 'AC' || device?.type === 'Heater';
const clampTemperature = (value) => Math.max(16, Math.min(30, Number(value)));
const calculateHvacImpact = (type, prevTemp, nextTemp) => {
  const delta = Number(nextTemp) - Number(prevTemp);
  if (type === 'AC' && delta < 0) return Math.abs(delta) * 0.35;
  if (type === 'Heater' && delta > 0) return Math.abs(delta) * 0.35;
  return 0;
};


router.use(authMiddleware);


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


router.post('/add', async (req, res) => {
  try {
    const { name, room, type, source, sensorType } = req.body;

    if (!name || !room || !type) {
      return res.status(400).json({ error: 'Поля name, room и type обязательны' });
    }

    const initialValue = (type === 'AC' || type === 'Heater') ? 24 : undefined;
    const initialUnit = (type === 'AC' || type === 'Heater') ? '°C' : undefined;

    const device = await addDevice({
      userId: req.user.id,
      name,
      room,
      type,
      source: source || 'Unknown',
      sensorType,
      value: initialValue,
      unit: initialUnit,
      status: false
    });

    res.status(201).json({
      message: 'Устройство успешно добавлено',
      device
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при добавлении устройства' });
  }
});


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


    const newStatus = !device.status;
    await updateDevice(deviceId, req.user.id, { status: newStatus });


    await addEnergyConsumption({
      userId: req.user.id,
      deviceId: device.id,
      deviceName: device.name,
      action: newStatus ? 'on' : 'off',
      energyConsumed: newStatus ? 1 : 0
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
    const nextValue = isHvacDevice(device) ? clampTemperature(value) : Number(value);
    const nextUnit = unit || (isHvacDevice(device) ? '°C' : device.unit);
    const prevValue = Number.isFinite(Number(device.value)) ? Number(device.value) : 24;
    const updatedDevice = await updateDeviceValue(deviceId, req.user.id, nextValue, nextUnit);

    if (updatedDevice?.type === 'Sensor') {
      const { checkSensorRules } = require('../services/scheduler');
      await checkSensorRules(updatedDevice);
    }

    if (updatedDevice && isHvacDevice(updatedDevice)) {
      const impact = calculateHvacImpact(updatedDevice.type, prevValue, nextValue);
      if (impact > 0) {
        await addEnergyConsumption({
          userId: req.user.id,
          deviceId: updatedDevice.id,
          deviceName: updatedDevice.name,
          action: 'temp_adjust',
          energyConsumed: Number(impact.toFixed(2))
        });
      }

      if (updatedDevice.type === 'AC' && Number(nextValue) <= 20) {
        const title = `Слишком низкая температура AC: ${updatedDevice.name}`;
        const existing = await prisma.aiRecommendation.findFirst({
          where: {
            userId: req.user.id,
            title,
            isApplied: false,
            isDismissed: false
          }
        });
        if (!existing) {
          await prisma.aiRecommendation.create({
            data: {
              userId: req.user.id,
              title,
              reason: `Цель ${updatedDevice.name} установлена на ${nextValue}°C. Повышение до 23–24°C снизит потребление без заметной потери комфорта.`,
              actionType: 'SET_TEMP',
              targetDeviceId: updatedDevice.id,
              estimatedKwhSaveMonth: 6,
              estimatedKztSaveMonth: 6 * 25,
              comfortRisk: 'low',
              autoApplicable: false,
              priority: 4
            }
          });
        }
        await addNotification({
          userId: req.user.id,
          title: 'Совет по энергосбережению',
          message: `Для ${updatedDevice.name} лучше повысить цель до 23–24°C, чтобы снизить расход.`,
          type: 'warning',
          icon: 'tips_and_updates'
        });
        await addAutomationLog({
          userId: req.user.id,
          message: `ИИ: ${updatedDevice.name} установлен слишком холодно (${nextValue}°C)`,
          metadata: JSON.stringify({ category: 'automation', source: 'ai', deviceId: updatedDevice.id, type: 'ac_overcool' })
        });
      }

      if (updatedDevice.type === 'Heater' && Number(nextValue) >= 25) {
        const title = `Слишком высокая температура Heater: ${updatedDevice.name}`;
        const existing = await prisma.aiRecommendation.findFirst({
          where: {
            userId: req.user.id,
            title,
            isApplied: false,
            isDismissed: false
          }
        });
        if (!existing) {
          await prisma.aiRecommendation.create({
            data: {
              userId: req.user.id,
              title,
              reason: `Цель ${updatedDevice.name} установлена на ${nextValue}°C. Снижение до 22–23°C заметно экономит электроэнергию.`,
              actionType: 'SET_TEMP',
              targetDeviceId: updatedDevice.id,
              estimatedKwhSaveMonth: 7,
              estimatedKztSaveMonth: 7 * 25,
              comfortRisk: 'low',
              autoApplicable: false,
              priority: 4
            }
          });
        }
        await addNotification({
          userId: req.user.id,
          title: 'Совет по энергосбережению',
          message: `Для ${updatedDevice.name} лучше снизить цель до 22–23°C, чтобы уменьшить расход.`,
          type: 'warning',
          icon: 'tips_and_updates'
        });
        await addAutomationLog({
          userId: req.user.id,
          message: `ИИ: ${updatedDevice.name} установлен слишком тепло (${nextValue}°C)`,
          metadata: JSON.stringify({ category: 'automation', source: 'ai', deviceId: updatedDevice.id, type: 'heater_overheat' })
        });
      }
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
