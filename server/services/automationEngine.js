// Движок автоматизации для умного дома
// Может быть расширен для автоматических действий на основе условий

const { getAllDevices, updateDevice } = require('../state');

/**
 * Проверяет условия и выполняет автоматические действия
 * @param {string} userId - ID пользователя
 * @param {object} conditions - Условия для проверки (температура, влажность и т.д.)
 * @returns {array} Массив выполненных действий
 */
const checkAndExecuteAutomation = (userId, conditions = {}) => {
  const actions = [];
  const devices = getAllDevices(userId);

  // Пример: автоматическое включение отопления при низкой температуре
  if (conditions.temperature !== undefined && conditions.temperature < 5) {
    const heatingDevices = devices.filter(device => 
      (device.type.toLowerCase().includes('heating') || 
       device.type.toLowerCase().includes('отопление')) && 
      !device.status
    );

    heatingDevices.forEach(device => {
      updateDevice(device.id, userId, { status: true });
      actions.push({
        type: 'automation',
        deviceId: device.id,
        deviceName: device.name,
        action: 'turned_on',
        reason: `Температура ниже 5°C (${conditions.temperature}°C)`
      });
    });
  }

  // Пример: автоматическое включение вентиляции при высокой влажности
  if (conditions.humidity !== undefined && conditions.humidity > 80) {
    const ventilationDevices = devices.filter(device => 
      (device.type.toLowerCase().includes('ventilation') || 
       device.type.toLowerCase().includes('вентиляция') ||
       device.type.toLowerCase().includes('fan')) && 
      !device.status
    );

    ventilationDevices.forEach(device => {
      updateDevice(device.id, userId, { status: true });
      actions.push({
        type: 'automation',
        deviceId: device.id,
        deviceName: device.name,
        action: 'turned_on',
        reason: `Высокая влажность (${conditions.humidity}%)`
      });
    });
  }

  return actions;
};

/**
 * Получить правила автоматизации для пользователя
 * @param {string} userId - ID пользователя
 * @returns {array} Массив правил автоматизации
 */
const getAutomationRules = (userId) => {
  // В будущем можно хранить правила в базе данных
  return [
    {
      id: 'auto_heating',
      name: 'Автоматическое отопление',
      enabled: true,
      condition: {
        type: 'temperature',
        operator: '<',
        value: 5
      },
      action: {
        type: 'turn_on',
        deviceType: 'heating'
      }
    },
    {
      id: 'auto_ventilation',
      name: 'Автоматическая вентиляция',
      enabled: true,
      condition: {
        type: 'humidity',
        operator: '>',
        value: 80
      },
      action: {
        type: 'turn_on',
        deviceType: 'ventilation'
      }
    }
  ];
};

module.exports = {
  checkAndExecuteAutomation,
  getAutomationRules
};
