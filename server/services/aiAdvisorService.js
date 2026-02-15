const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateRecommendations = async (userId) => {
    // 1. Fetch user data (devices, settings, logs)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            devices: true,
            settings: true,
            energyLogs: {
                where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Last 30 days
            }
        }
    });

    if (!user) return [];

    const recommendations = [];

    // 2. Analyze Devices
    const lights = user.devices.filter(d => d.type === 'Light');
    const activeLights = lights.filter(d => d.status);

    // Rule 1: Too many active lights
    if (activeLights.length > 5) {
        recommendations.push({
            title: 'Выключить лишнее освещение',
            reason: `Сейчас включено ${activeLights.length} источников света. Отключение половины сэкономит энергию.`,
            actionType: 'TOGGLE_DEVICE',
            targetDeviceId: null, // General advice or specific logic to pick ID
            estimatedKwhSaveMonth: activeLights.length * 0.06 * 5 * 30, // Approx 60W * 5h * 30d
            estimatedKztSaveMonth: activeLights.length * 0.06 * 5 * 30 * 25, // 25 KZT/kWh
            comfortRisk: 'low',
            autoApplicable: true,
            priority: 3
        });
    }

    // Rule 2: HVAC Optimization
    const heaters = user.devices.filter(d => d.type === 'Heater' && d.status && d.value > 24);
    if (heaters.length > 0) {
        recommendations.push({
            title: 'Оптимизировать обогреватель',
            reason: 'Температура обогревателя установлена выше 24°C. Снижение на 1°C экономит до 7% энергии.',
            actionType: 'SET_TEMP',
            targetDeviceId: heaters[0].id,
            estimatedKwhSaveMonth: 2 * 30, // Approx
            estimatedKztSaveMonth: 2 * 30 * 25,
            comfortRisk: 'medium',
            autoApplicable: false, // Manual approve
            priority: 4
        });
    }

    // Rule 3: Home Mode
    if (user.settings?.homeMode === 'Home' && new Date().getHours() > 23) {
        recommendations.push({
            title: 'Включить ночной режим',
            reason: 'Позднее время, но дом все еще в режиме "Home". Переход в "Night" отключит лишние устройства.',
            actionType: 'SET_MODE',
            targetDeviceId: 'NIGHT_MODE',
            estimatedKwhSaveMonth: 15,
            estimatedKztSaveMonth: 15 * 25,
            comfortRisk: 'low',
            autoApplicable: true,
            priority: 5
        });
    }

    // Rule 4: High Consumption Alert (Analysis of logs)
    const totalConsumption = user.energyLogs.reduce((acc, log) => acc + log.energyConsumed, 0);
    if (totalConsumption > 300) { // e.g., > 300 kWh
        recommendations.push({
            title: 'Аномально высокое потребление',
            reason: 'Ваше потребление за месяц превысило 300 кВт·ч. Проверьте энергоемкие приборы.',
            actionType: 'AUDIT',
            targetDeviceId: null,
            estimatedKwhSaveMonth: 50,
            estimatedKztSaveMonth: 50 * 25,
            comfortRisk: 'low',
            autoApplicable: false,
            priority: 2
        });
    }

    // Sync to DB
    for (const rec of recommendations) {
        // Check duplicate
        const exists = await prisma.aiRecommendation.findFirst({
            where: { userId, title: rec.title, isDismissed: false, isApplied: false }
        });

        if (!exists) {
            await prisma.aiRecommendation.create({
                data: { ...rec, userId }
            });
        }
    }

    return await prisma.aiRecommendation.findMany({
        where: { userId, isDismissed: false, isApplied: false },
        orderBy: { priority: 'desc' }
    });
};

const applyRecommendation = async (userId, recId) => {
    const rec = await prisma.aiRecommendation.findFirst({
        where: {
            id: recId,
            userId,
            isDismissed: false,
            isApplied: false
        }
    });
    if (!rec) throw new Error('Recommendation not found');

    // Safety check
    const WHITELIST_ACTIONS = ['TOGGLE_DEVICE', 'SET_MODE', 'SET_TEMP'];
    if (!WHITELIST_ACTIONS.includes(rec.actionType)) {
        throw new Error('Action not safe or auto-executable');
    }

    let logDetails = '';
    let status = 'SUCCESS';
    let targetDeviceId = rec.targetDeviceId;

    if (rec.actionType === 'SET_MODE') {
        await prisma.userSettings.upsert({
            where: { userId },
            create: { userId, homeMode: 'Night' },
            update: { homeMode: 'Night' }
        });
        logDetails = 'Switched to Night Mode';
    } else if (rec.actionType === 'TOGGLE_DEVICE') {
        if (rec.targetDeviceId) {
            const device = await prisma.device.findFirst({
                where: { id: rec.targetDeviceId, userId }
            });
            if (!device) {
                throw new Error('Target device not found');
            }
            await prisma.device.update({
                where: { id: device.id },
                data: { status: !device.status }
            });
            logDetails = `Toggled device: ${device.name}`;
            targetDeviceId = device.id;
        } else {
            const activeLight = await prisma.device.findFirst({
                where: { userId, type: 'Light', status: true },
                orderBy: { updatedAt: 'desc' }
            });
            if (activeLight) {
                await prisma.device.update({
                    where: { id: activeLight.id },
                    data: { status: false }
                });
                logDetails = `Turned off light: ${activeLight.name}`;
                targetDeviceId = activeLight.id;
            } else {
                logDetails = 'No active lights found for auto action';
                status = 'FAILED';
            }
        }
    } else if (rec.actionType === 'SET_TEMP' && rec.targetDeviceId) {
        const device = await prisma.device.findFirst({
            where: { id: rec.targetDeviceId, userId }
        });

        if (device) {
            const currentValue = Number(device.value || 24);
            const nextValue = Math.max(18, currentValue - 1);
            await prisma.device.update({
                where: { id: device.id },
                data: { value: nextValue }
            });
            logDetails = `Lowered temperature for ${device.name} to ${nextValue}°C`;
            targetDeviceId = device.id;
        } else {
            status = 'FAILED';
            logDetails = 'Target temperature device not found';
        }
    }

    // Mark as applied
    await prisma.aiRecommendation.update({
        where: { id: recId },
        data: { isApplied: true }
    });

    // Log
    await prisma.aiActionLog.create({
        data: {
            userId,
            actionType: rec.actionType,
            targetDeviceId,
            details: logDetails || rec.reason,
            status
        }
    });

    return { success: status === 'SUCCESS', status };
};

const dismissRecommendation = async (userId, recId) => {
    const updateResult = await prisma.aiRecommendation.updateMany({
        where: { id: recId, userId },
        data: { isDismissed: true }
    });
    if (updateResult.count === 0) {
        throw new Error('Recommendation not found');
    }
    return { success: true };
};

const getActionLogs = async (userId, limit = 10) => {
    return prisma.aiActionLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: Math.min(Math.max(Number(limit) || 10, 1), 50)
    });
};

module.exports = { generateRecommendations, applyRecommendation, dismissRecommendation, getActionLogs };
