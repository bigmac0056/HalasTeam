const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const HVAC_MIN_TEMP = 16;
const HVAC_MAX_TEMP = 30;
const HVAC_AI_TARGETS = {
    Heater: 22,
    AC: 24
};

const clampHvacTarget = (value) => Math.max(HVAC_MIN_TEMP, Math.min(HVAC_MAX_TEMP, Number(value)));

const generateRecommendations = async (userId) => {

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            devices: true,
            settings: true,
            energyLogs: {
                where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
            }
        }
    });

    if (!user) return [];

    const recommendations = [];


    const lights = user.devices.filter(d => d.type === 'Light');
    const activeLights = lights.filter(d => d.status);


    if (activeLights.length > 5) {
        recommendations.push({
            title: 'Выключить лишнее освещение',
            reason: `Сейчас включено ${activeLights.length} источников света. Отключение половины сэкономит энергию.`,
            actionType: 'TOGGLE_DEVICE',
            targetDeviceId: null,
            estimatedKwhSaveMonth: activeLights.length * 0.06 * 5 * 30,
            estimatedKztSaveMonth: activeLights.length * 0.06 * 5 * 30 * 25,
            comfortRisk: 'low',
            autoApplicable: true,
            priority: 3
        });
    }


    const heaters = user.devices.filter(d => d.type === 'Heater' && d.status && Number(d.value) >= 25);
    if (heaters.length > 0) {
        recommendations.push({
            title: 'Оптимизировать обогреватель',
            reason: 'Температура обогревателя выше энергоэффективного диапазона. Рекомендуем установить 22°C.',
            actionType: 'SET_TEMP',
            targetDeviceId: heaters[0].id,
            estimatedKwhSaveMonth: 2 * 30,
            estimatedKztSaveMonth: 2 * 30 * 25,
            comfortRisk: 'medium',
            autoApplicable: false,
            priority: 4
        });
    }

    const overcooledAc = user.devices.filter(d => d.type === 'AC' && d.status && Number(d.value) <= 20);
    if (overcooledAc.length > 0) {
        recommendations.push({
            title: 'Оптимизировать кондиционер',
            reason: 'Температура кондиционера слишком низкая. Рекомендуем установить 24°C для снижения расхода.',
            actionType: 'SET_TEMP',
            targetDeviceId: overcooledAc[0].id,
            estimatedKwhSaveMonth: 6 * 30,
            estimatedKztSaveMonth: 6 * 30 * 25,
            comfortRisk: 'low',
            autoApplicable: false,
            priority: 4
        });
    }


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


    const totalConsumption = user.energyLogs.reduce((acc, log) => acc + log.energyConsumed, 0);
    if (totalConsumption > 300) {
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


    for (const rec of recommendations) {

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
            const recommendedTarget = HVAC_AI_TARGETS[device.type];
            const nextValue = Number.isFinite(Number(recommendedTarget))
                ? clampHvacTarget(recommendedTarget)
                : clampHvacTarget(currentValue);
            await prisma.device.update({
                where: { id: device.id },
                data: { value: nextValue }
            });
            logDetails = `Adjusted temperature for ${device.name} to ${nextValue}°C`;
            targetDeviceId = device.id;
        } else {
            status = 'FAILED';
            logDetails = 'Target temperature device not found';
        }
    }


    await prisma.aiRecommendation.update({
        where: { id: recId },
        data: { isApplied: true }
    });


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

const clearActionLogs = async (userId) => {
    const result = await prisma.aiActionLog.deleteMany({
        where: { userId }
    });
    return {
        success: true,
        deleted: result.count
    };
};

const getRecommendationsStatus = async (userId, lookbackDays = 30) => {
    const safeLookbackDays = Math.min(Math.max(Number(lookbackDays) || 30, 1), 365);
    const since = new Date(Date.now() - safeLookbackDays * 24 * 60 * 60 * 1000);

    const [activeRecs, appliedRecs, actionLogs] = await Promise.all([
        prisma.aiRecommendation.findMany({
            where: { userId, isDismissed: false, isApplied: false },
            orderBy: { priority: 'desc' }
        }),
        prisma.aiRecommendation.findMany({
            where: { userId, isApplied: true },
            orderBy: { createdAt: 'desc' },
            take: 20
        }),
        prisma.aiActionLog.findMany({
            where: { userId, timestamp: { gte: since } },
            orderBy: { timestamp: 'desc' },
            take: 50
        })
    ]);

    const estimatedSavedKwh = appliedRecs.reduce((sum, rec) => sum + Number(rec.estimatedKwhSaveMonth || 0), 0);
    const estimatedSavedKzt = appliedRecs.reduce((sum, rec) => sum + Number(rec.estimatedKztSaveMonth || 0), 0);
    const successfulActions = actionLogs.filter((log) => log.status === 'SUCCESS').length;

    return {
        lookbackDays: safeLookbackDays,
        new: {
            count: activeRecs.length,
            items: activeRecs
        },
        applied: {
            count: appliedRecs.length,
            items: appliedRecs
        },
        effect: {
            successfulActions,
            estimatedSavedKwhMonth: Number(estimatedSavedKwh.toFixed(1)),
            estimatedSavedKztMonth: Number(estimatedSavedKzt.toFixed(0))
        }
    };
};

module.exports = {
    generateRecommendations,
    applyRecommendation,
    dismissRecommendation,
    getActionLogs,
    clearActionLogs,
    getRecommendationsStatus
};
