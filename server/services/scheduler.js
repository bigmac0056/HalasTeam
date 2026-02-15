const {
    prisma,
    getAllDevices,
    updateDevice,
    addAutomationLog,
    addNotification
} = require('../state');

// Check every 30 seconds
const CHECK_INTERVAL = 30 * 1000;
const SENSOR_EVENT_COOLDOWN_MS = 120 * 1000;
const sensorEventCooldowns = new Map();

const RISK_DEVICE_TYPES = new Set(['Light', 'Heater', 'AC', 'Socket', 'Speaker']);

const isSpeakerDevice = (device) => {
    if (!device) return false;
    const name = String(device.name || '').toLowerCase();
    return device.type === 'Speaker' || (device.type === 'Socket' && (name.includes('speaker') || name.includes('колон')));
};

const getActionStatus = (actionData) => {
    if (typeof actionData?.status === 'boolean') return actionData.status;
    if (typeof actionData?.setStatus === 'boolean') return actionData.setStatus;
    return null;
};

const getTriggerTime = (triggerData) => {
    if (typeof triggerData?.time === 'string') return triggerData.time;
    if (typeof triggerData?.value === 'string') return triggerData.value;
    return null;
};

const shouldProcessSensorEvent = (userId, sensorId, eventType, isActive) => {
    const key = `${userId}:${sensorId}:${eventType}:${isActive ? '1' : '0'}`;
    const now = Date.now();
    const lastAt = sensorEventCooldowns.get(key);
    if (lastAt && now - lastAt < SENSOR_EVENT_COOLDOWN_MS) {
        return false;
    }
    sensorEventCooldowns.set(key, now);
    return true;
};

const startScheduler = () => {
    console.log('⏰ Automation Scheduler started...');

    setInterval(async () => {
        try {
            await checkAndExecuteRules();
        } catch (err) {
            console.error('Scheduler Error:', err);
        }
    }, CHECK_INTERVAL);
};

const checkAndExecuteRules = async (forceRuleId = null) => {
    try {
        const where = { enabled: true };
        if (forceRuleId) where.id = forceRuleId;

        const rules = await prisma.automationRule.findMany({
            where,
            include: { user: true } // Need user timezone if supported, otherwise default
        });

        const now = new Date();
        // Default to Asia/Almaty as requested, or user's TZ if we had it
        const timeZone = 'Asia/Almaty';
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone
        });
        const currentTimeStr = formatter.format(now); // "18:30"

        const executed = [];

        for (const rule of rules) {
            // Parse Trigger
            let triggerData;
            try {
                triggerData = JSON.parse(rule.trigger);
            } catch (e) {
                continue;
            }

            // Check Time Trigger
            if (triggerData.type === 'time') {
                const ruleTime = getTriggerTime(triggerData);
                if (ruleTime === currentTimeStr) {
                    // Check if already executed this minute (Debounce)
                    if (rule.lastTriggeredAt) {
                        const lastRun = new Date(rule.lastTriggeredAt);
                        const timeSince = now - lastRun;
                        if (timeSince < 60000) {
                            // Already ran within the last minute
                            continue;
                        }
                    }

                    // EXECUTE
                    const result = await executeRuleAction(rule);
                    if (result) executed.push(result);
                }
            }
        }

        return executed;
    } catch (error) {
        console.error('Error in checkAndExecuteRules:', error);
        return [];
    }
};

const executeRuleAction = async (rule) => {
    try {
        let actionData;
        try {
            actionData = JSON.parse(rule.action);
        } catch (e) {
            return;
        }

        const desiredStatus = getActionStatus(actionData);
        const targetDeviceId = actionData?.deviceId;
        if (!targetDeviceId || desiredStatus === null) return null;

        const device = await prisma.device.findFirst({
            where: { id: targetDeviceId, userId: rule.userId }
        });

        if (!device) return null;

        // Execute Device Change
        if (device.status !== desiredStatus) {
            await updateDevice(device.id, rule.userId, { status: desiredStatus });

            const statusText = desiredStatus ? 'ВКЛ' : 'ВЫКЛ';
            const message = `⚡ Автоматизация: ${device.name} ${statusText} ("${rule.name}")`;

            // Log
            await addAutomationLog({
                userId: rule.userId,
                message: message,
                metadata: JSON.stringify({ source: 'scheduler', ruleId: rule.id })
            });

            // Notify
            await addNotification({
                userId: rule.userId,
                title: 'Автоматизация',
                message: `${device.name} автоматически ${statusText}`,
                type: 'success',
                icon: 'smart_toy'
            });

            // Update Last Triggered
            await prisma.automationRule.update({
                where: { id: rule.id },
                data: { lastTriggeredAt: new Date() }
            });

            console.log(`Executed Rule: ${rule.name}`);

            return {
                ruleId: rule.id,
                ruleName: rule.name,
                deviceId: device.id,
                deviceName: device.name,
                status: desiredStatus
            };
        }

        return null;
    } catch (err) {
        console.error(`Failed to execute rule ${rule.name}:`, err);
        return null;
    }
};

const checkSensorRules = async (sensorDevice) => {
    if (!sensorDevice?.userId || sensorDevice.type !== 'Sensor') return [];

    const userId = sensorDevice.userId;
    const sensorType = String(sensorDevice.sensorType || '').toLowerCase();
    const value = Number(sensorDevice.value || 0);
    const isActive = value >= 1;
    const actions = [];

    const setAlertState = async (nextIsAlert) => {
        if (Boolean(sensorDevice.isAlert) === Boolean(nextIsAlert)) return;
        await updateDevice(sensorDevice.id, userId, { isAlert: Boolean(nextIsAlert) });
    };

    if (sensorType === 'smoke' || sensorType === 'waterleak') {
        await setAlertState(isActive);
        if (!shouldProcessSensorEvent(userId, sensorDevice.id, sensorType, isActive)) return actions;

        const label = sensorType === 'smoke' ? 'дым' : 'протечка воды';

        if (isActive) {
            const devices = await getAllDevices(userId);
            const turnedOff = [];

            for (const device of devices) {
                const canShutdown = RISK_DEVICE_TYPES.has(device.type) || isSpeakerDevice(device);
                if (!canShutdown || !device.status || device.id === sensorDevice.id) continue;
                await updateDevice(device.id, userId, { status: false });
                turnedOff.push(device.name);
            }

            const message = turnedOff.length > 0
                ? `Тревога (${label}): отключено ${turnedOff.length} устройств (${turnedOff.join(', ')})`
                : `Тревога (${label}): обнаружено событие датчика`;

            await addAutomationLog({
                userId,
                message,
                metadata: JSON.stringify({
                    source: 'sensor',
                    sensorType,
                    sensorId: sensorDevice.id,
                    sensorName: sensorDevice.name,
                    turnedOff
                })
            });

            await addNotification({
                userId,
                title: 'Тревога безопасности',
                message: `Сработал датчик "${sensorDevice.name}" (${label})`,
                type: 'alert',
                icon: sensorType === 'smoke' ? 'local_fire_department' : 'water_drop'
            });

            actions.push({ type: sensorType, alert: true, turnedOff });
            return actions;
        }

        await addAutomationLog({
            userId,
            message: `Тревога (${label}) снята: датчик "${sensorDevice.name}" в норме`,
            metadata: JSON.stringify({
                source: 'sensor',
                sensorType,
                sensorId: sensorDevice.id,
                sensorName: sensorDevice.name,
                alertResolved: true
            })
        });

        await addNotification({
            userId,
            title: 'Статус безопасности',
            message: `Датчик "${sensorDevice.name}" вернулся в норму`,
            type: 'info',
            icon: 'shield'
        });

        actions.push({ type: sensorType, alert: false });
        return actions;
    }

    if (sensorType === 'motion') {
        const settings = await prisma.userSettings.findUnique({ where: { userId } });
        const homeMode = settings?.homeMode || 'Home';
        const isArmedMode = homeMode === 'Away' || homeMode === 'Vacation';
        await setAlertState(isActive && isArmedMode);
        if (!shouldProcessSensorEvent(userId, sensorDevice.id, 'motion', isActive && isArmedMode)) return actions;

        if (!isActive || !isArmedMode) return actions;

        const devices = await getAllDevices(userId);
        const enabledCameras = [];
        for (const device of devices) {
            if (device.type !== 'Camera' || device.status) continue;
            await updateDevice(device.id, userId, { status: true });
            enabledCameras.push(device.name);
        }

        await addAutomationLog({
            userId,
            message: enabledCameras.length > 0
                ? `Тревога (движение): включены камеры (${enabledCameras.join(', ')})`
                : 'Тревога (движение): движение обнаружено в режиме охраны',
            metadata: JSON.stringify({
                source: 'sensor',
                sensorType: 'motion',
                sensorId: sensorDevice.id,
                sensorName: sensorDevice.name,
                homeMode,
                enabledCameras
            })
        });

        await addNotification({
            userId,
            title: 'Тревога безопасности',
            message: `Обнаружено движение: ${sensorDevice.name}`,
            type: 'warning',
            icon: 'directions_run'
        });

        actions.push({ type: 'motion', alert: true, enabledCameras });
    }

    return actions;
};

module.exports = { startScheduler, checkAndExecuteRules, checkSensorRules };
