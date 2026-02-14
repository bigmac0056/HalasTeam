const automationLogs = [];
const users = [];
const devices = [];
const energyConsumption = [];

// Генерация уникального ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Управление пользователями
const addUser = (user) => {
  const newUser = { ...user, id: generateId() };
  users.push(newUser);
  return newUser;
};

const findUserByEmail = (email) => {
  return users.find(user => user.email === email);
};

const findUserById = (id) => {
  return users.find(user => user.id === id);
};

// Управление устройствами
const addDevice = (device) => {
  const newDevice = { ...device, id: generateId() };
  devices.push(newDevice);
  return newDevice;
};

const getAllDevices = (userId) => {
  return devices.filter(device => device.userId === userId);
};

const findDeviceById = (id, userId) => {
  return devices.find(device => device.id === id && device.userId === userId);
};

const updateDevice = (id, userId, updates) => {
  const device = findDeviceById(id, userId);
  if (device) {
    Object.assign(device, updates);
    return device;
  }
  return null;
};

const deleteDevice = (id, userId) => {
  const index = devices.findIndex(device => device.id === id && device.userId === userId);
  if (index !== -1) {
    devices.splice(index, 1);
    return true;
  }
  return false;
};

// Управление энергопотреблением
const addEnergyConsumption = (data) => {
  energyConsumption.push({
    ...data,
    id: generateId(),
    timestamp: new Date().toISOString()
  });
};

const getEnergyConsumptionByUserId = (userId) => {
  return energyConsumption.filter(record => record.userId === userId);
};

// Управление автоматизациями
const addAutomationLog = (data) => {
  const newLog = {
    id: generateId(),
    ...data,
    timestamp: new Date().toISOString()
  };
  automationLogs.push(newLog);
  return newLog;
};

const getAutomationLogsByUserId = (userId) => {
  return automationLogs.filter(log => log.userId === userId);
};

module.exports = {
  users,
  devices,
  energyConsumption,
  addUser,
  findUserByEmail,
  findUserById,
  addDevice,
  getAllDevices,
  findDeviceById,
  updateDevice,
  deleteDevice,
  addEnergyConsumption,
  getEnergyConsumptionByUserId,
  automationLogs,
  addAutomationLog,
  getAutomationLogsByUserId
};
