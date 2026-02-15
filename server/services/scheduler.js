const {
    prisma,
    getAllDevices,
    updateDevice,
    addAutomationLog,
    addNotification
} = require('../state');

// Check every 30 seconds
const CHECK_INTERVAL = 30 * 1000;

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
                if (triggerData.time === currentTimeStr) {
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
                    await executeRuleAction(rule);
                }
            }
        }
    } catch (error) {
        console.error('Error in checkAndExecuteRules:', error);
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

        const device = await prisma.device.findFirst({
            where: { id: actionData.deviceId, userId: rule.userId }
        });

        if (!device) return;

        // Execute Device Change
        if (device.status !== actionData.status) {
            await updateDevice(device.id, rule.userId, { status: actionData.status });

            const statusText = actionData.status ? 'ВКЛ' : 'ВЫКЛ';
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
        }
    } catch (err) {
        console.error(`Failed to execute rule ${rule.name}:`, err);
    }
};

module.exports = { startScheduler, checkAndExecuteRules };
