const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Генерация уникального ID (Not needed for Prisma usually, but keeping for compatibility if utilized elsewhere, though Prisma UUIDs handle it)
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Управление пользователями
const addUser = async (user) => {
  return await prisma.user.create({ data: user });
};

const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

const findUserById = async (id) => {
  return await prisma.user.findUnique({ where: { id } });
};

const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data
  });
};

// Управление устройствами
const addDevice = async (device) => {
  return await prisma.device.create({ data: device });
};

const getAllDevices = async (userId) => {
  return await prisma.device.findMany({ where: { userId } });
};

const findDeviceById = async (id, userId) => {
  // Prisma findFirst for composite check
  return await prisma.device.findFirst({ where: { id, userId } });
};

const updateDevice = async (id, userId, updates) => {
  // Ensure device belongs to user
  const device = await findDeviceById(id, userId);
  if (!device) return null;
  return await prisma.device.update({
    where: { id },
    data: updates
  });
};

const updateDeviceValue = async (id, userId, value, unit) => {
  // Verify ownership implicitly via updateMany or explicit check
  // updateMany is safer if we just want to target by userId + id
  const result = await prisma.device.updateMany({
    where: { id, userId },
    data: {
      value: Number(value),
      unit,
      lastUpdated: new Date()
    }
  });
  return result.count > 0 ? await findDeviceById(id, userId) : null;
};

const deleteDevice = async (id, userId) => {
  const result = await prisma.device.deleteMany({ where: { id, userId } });
  return result.count > 0;
};

// Управление энергопотреблением
const addEnergyConsumption = async (data) => {
  return await prisma.energyLog.create({ data });
};

const getEnergyConsumptionByUserId = async (userId) => {
  return await prisma.energyLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' }
  });
};

// Automation Logs
// Anti-spam: prevent duplicate messages within COOLDOWN_MS
const logCooldowns = new Map();
const LOG_COOLDOWN_MS = 60 * 1000;

const addAutomationLog = async (data) => {
  const { userId, message } = data;
  const key = `${userId}:${message}`;
  const now = Date.now();

  if (logCooldowns.has(key)) {
    const lastTime = logCooldowns.get(key);
    if (now - lastTime < LOG_COOLDOWN_MS) {
      console.log(`Skipping duplicate log: ${message}`);
      return null;
    }
  }

  logCooldowns.set(key, now);

  return await prisma.automationLog.create({
    data: {
      userId,
      message,
      metadata: data.metadata,
      timestamp: data.timestamp || new Date()
    }
  });
};

const getAutomationLogsByUserId = async (userId) => {
  return await prisma.automationLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 50
  });
};

// Automation Rules
const addAutomationRule = async (data) => {
  return await prisma.automationRule.create({
    data: {
      userId: data.userId,
      name: data.name,
      trigger: data.trigger,
      action: data.action,
      icon: data.icon,
      enabled: data.enabled !== undefined ? data.enabled : true
    }
  });
};

const getAutomationRulesByUserId = async (userId) => {
  return await prisma.automationRule.findMany({
    where: { userId }
  });
};

const toggleAutomationRule = async (id, userId) => {
  const rule = await prisma.automationRule.findFirst({
    where: { id, userId }
  });
  if (rule) {
    return await prisma.automationRule.update({
      where: { id },
      data: { enabled: !rule.enabled }
    });
  }
  return null;
};

const deleteAutomationRule = async (id, userId) => {
  const batch = await prisma.automationRule.deleteMany({
    where: { id, userId }
  });
  return batch.count > 0;
};

// Notifications
const addNotification = async (data) => {
  return await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title || 'Notification',
      message: data.message || data.text,
      type: data.type || 'info',
      icon: data.icon,
      isRead: false,
      timestamp: data.timestamp || new Date()
    }
  });
};

const getNotificationsByUserId = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 50
  });
};

const markNotificationAsRead = async (id, userId) => {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  });
  return true;
};

const clearNotifications = async (userId) => {
  await prisma.notification.deleteMany({ where: { userId } });
  return true;
};

// Home Mode Helper
const getHomeMode = async (userId) => {
  try {
    if (!userId) return 'Home';
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    return settings ? settings.homeMode : 'Home';
  } catch (error) {
    console.error('Error in getHomeMode:', error);
    return 'Home';
  }
};

const setHomeMode = async (userId, mode) => {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: { homeMode: mode },
    create: { userId, homeMode: mode }
  });

  // Side effects for Home Modes
  const devices = await getAllDevices(userId);
  const turnedOff = [];

  if (mode === 'Away' || mode === 'Vacation') {
    // Turn off all lights and heaters/AC
    for (const device of devices) {
      if (device.status && (device.type === 'Light' || device.type === 'Heater' || device.type === 'AC' || device.type === 'Socket')) {
        await updateDevice(device.id, userId, { status: false });
        turnedOff.push(device.name);
      }
    }

    const message = turnedOff.length > 0
      ? `Режим "${mode}": Выключено ${turnedOff.length} устройств (${turnedOff.join(', ')})`
      : `Режим "${mode}" активирован`;

    await addAutomationLog({
      userId,
      message,
      metadata: JSON.stringify({ mode, action: 'shutdown', devices: turnedOff })
    });

    return { homeMode: settings.homeMode, message, turnedOff };
  } else if (mode === 'Night') {
    // Turn off all lights
    for (const device of devices) {
      if (device.status && device.type === 'Light') {
        await updateDevice(device.id, userId, { status: false });
        turnedOff.push(device.name);
      }
    }

    const message = turnedOff.length > 0
      ? `Режим "Ночь": Выключено ${turnedOff.length} ламп (${turnedOff.join(', ')})`
      : `Режим "Ночь" активирован`;

    await addAutomationLog({
      userId,
      message,
      metadata: JSON.stringify({ mode, action: 'shutdown', devices: turnedOff })
    });

    return { homeMode: settings.homeMode, message, turnedOff };
  } else {
    await addAutomationLog({
      userId,
      message: `Режим "Дома" активирован`,
      metadata: JSON.stringify({ mode })
    });
  }

  return { homeMode: settings.homeMode, message: `Режим изменен на ${mode}`, turnedOff: [] };
};


module.exports = {
  prisma,
  addUser,
  findUserByEmail,
  findUserById,
  updateUser,
  addDevice,
  getAllDevices,
  findDeviceById,
  updateDevice,
  updateDeviceValue,
  deleteDevice,
  addEnergyConsumption,
  getEnergyConsumptionByUserId,
  addAutomationLog,
  getAutomationLogsByUserId,
  addAutomationRule,
  getAutomationRulesByUserId,
  toggleAutomationRule,
  deleteAutomationRule,
  addNotification,
  getNotificationsByUserId,
  markNotificationAsRead,
  clearNotifications,
  getHomeMode,
  setHomeMode
};
