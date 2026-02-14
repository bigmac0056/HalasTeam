const { getAllDevices, getEnergyConsumptionByUserId } = require('../state');

const getRecommendations = (userId, weatherData = null) => {
  const recommendations = [];
  const devices = getAllDevices(userId);
  const activeDevices = devices.filter(device => device.status);
  const energyRecords = getEnergyConsumptionByUserId(userId);

  if (weatherData) {
    if (weatherData.temperature < 0) {
      const hasHeating = devices.some(device => 
        device.type.toLowerCase().includes('heating') || 
        device.type.toLowerCase().includes('отопление')
      );
      
      if (hasHeating) {
        const heatingDevice = devices.find(device => 
          (device.type.toLowerCase().includes('heating') || 
           device.type.toLowerCase().includes('отопление')) && 
          !device.status
        );
        
        if (heatingDevice) {
          recommendations.push({
            type: 'weather',
            priority: 'high',
            message: `Температура на улице ${weatherData.temperature}°C. Рекомендуется включить отопление.`,
            action: `Включить устройство "${heatingDevice.name}"`,
            deviceId: heatingDevice.id
          });
        }
      } else {
        recommendations.push({
          type: 'weather',
          priority: 'high',
          message: `Температура на улице ${weatherData.temperature}°C. Рекомендуется проверить систему отопления.`
        });
      }
    }

    if (weatherData.humidity > 70) {
      const hasVentilation = devices.some(device => 
        device.type.toLowerCase().includes('ventilation') || 
        device.type.toLowerCase().includes('вентиляция') ||
        device.type.toLowerCase().includes('fan')
      );
      
      if (hasVentilation) {
        const ventilationDevice = devices.find(device => 
          (device.type.toLowerCase().includes('ventilation') || 
           device.type.toLowerCase().includes('вентиляция') ||
           device.type.toLowerCase().includes('fan')) && 
          !device.status
        );
        
        if (ventilationDevice) {
          recommendations.push({
            type: 'weather',
            priority: 'medium',
            message: `Высокая влажность (${weatherData.humidity}%). Рекомендуется проверить вентиляцию.`,
            action: `Включить устройство "${ventilationDevice.name}"`,
            deviceId: ventilationDevice.id
          });
        }
      } else {
        recommendations.push({
          type: 'weather',
          priority: 'medium',
          message: `Высокая влажность (${weatherData.humidity}%). Рекомендуется проверить систему вентиляции.`
        });
      }
    }
  }

  if (activeDevices.length > 5) {
    recommendations.push({
      type: 'energy',
      priority: 'medium',
      message: `Активно ${activeDevices.length} устройств. Рекомендуется отключить неиспользуемые устройства для экономии энергии.`,
      activeDevicesCount: activeDevices.length
    });
  }
  
  const totalEnergy = energyRecords.reduce((sum, record) => sum + (record.energyConsumed || 0), 0);
  if (totalEnergy > 50) {
    recommendations.push({
      type: 'energy',
      priority: 'low',
      message: `Высокое энергопотребление за период. Рассмотрите возможность оптимизации использования устройств.`,
      totalEnergy
    });
  }

  // Если нет активных устройств
  if (activeDevices.length === 0 && devices.length > 0) {
    recommendations.push({
      type: 'info',
      priority: 'low',
      message: 'Все устройства выключены. Система работает в энергосберегающем режиме.'
    });
  }

  return recommendations;
};

module.exports = {
  getRecommendations
};
