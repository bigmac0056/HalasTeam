const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAutomationRulesByUserId,
  addAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  getAutomationLogsByUserId,
  addAutomationLog,
  getAllDevices,
  updateDevice,
  addNotification,
  prisma
} = require('../state');

router.use(authMiddleware);

// Get all automation rules
router.get('/', async (req, res) => {
  try {
    const rules = await getAutomationRulesByUserId(req.user.id);
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

// Create a new automation rule
router.post('/', async (req, res) => {
  try {
    const { name, trigger, action, icon } = req.body;
    if (!name || !trigger || !action) {
      return res.status(400).json({ error: 'Name, trigger, and action are required' });
    }

    const rule = await addAutomationRule({
      userId: req.user.id,
      name,
      trigger: typeof trigger === 'object' ? JSON.stringify(trigger) : trigger,
      action: typeof action === 'object' ? JSON.stringify(action) : action,
      icon: icon || 'smart_toy'
    });

    res.status(201).json({ rule });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// Toggle an automation rule
router.patch('/:id/toggle', async (req, res) => {
  try {
    const rule = await toggleAutomationRule(req.params.id, req.user.id);
    if (rule) {
      res.json({ rule });
    } else {
      res.status(404).json({ error: 'Rule not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// Clear automation logs
router.delete('/logs', async (req, res) => {
  try {
    const { before, all } = req.query;
    const userId = req.user.id;
    let where = { userId };

    if (all === 'true') {
      // Delete all logs for user
    } else if (before) {
      // Delete logs before a specific date
      const date = new Date(before);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      where.timestamp = { lt: date };
    } else {
      return res.status(400).json({ error: 'Specify ?all=true or ?before=YYYY-MM-DD' });
    }

    const batch = await prisma.automationLog.deleteMany({ where });

    // Add a system log about the cleanup
    if (batch.count > 0) {
      await addAutomationLog({
        userId,
        message: `🧹 Журнал очищен: удалено ${batch.count} записей`
      });
    }

    res.json({ success: true, count: batch.count });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Delete an automation rule
router.delete('/:id', async (req, res) => {
  try {
    const success = await deleteAutomationRule(req.params.id, req.user.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Rule not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Execute automation rules — checks all enabled rules and performs matching actions
router.post('/execute', async (req, res) => {
  try {
    const { temperature } = req.body; // current temperature from client
    const rules = await getAutomationRulesByUserId(req.user.id);
    const devices = await getAllDevices(req.user.id);
    const executed = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let triggerData, actionData;
      try {
        triggerData = JSON.parse(rule.trigger);
        actionData = JSON.parse(rule.action);
      } catch {
        continue; // Skip rules with non-JSON (legacy text) format
      }

      let shouldExecute = false;

      // Time-based trigger: { type: "time", time: "HH:MM" }
      // Uses a 2-minute window to avoid missing the target minute with 60s checks
      if (triggerData.type === 'time') {
        const now = new Date();
        const triggerTime = triggerData.time || triggerData.value;
        if (!triggerTime || typeof triggerTime !== 'string' || !triggerTime.includes(':')) continue;
        const [targetHour, targetMin] = triggerTime.split(':').map(Number);
        const targetMs = targetHour * 3600000 + targetMin * 60000;
        const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;
        const diff = nowMs - targetMs;
        // Trigger if within 0 to 2 minutes after the target time
        shouldExecute = diff >= 0 && diff < 120000;
      }

      // Temperature-based trigger: { type: "temperature", operator: "<" | ">", value: 20 }
      if (triggerData.type === 'temperature' && temperature !== undefined) {
        if (triggerData.operator === '<') {
          shouldExecute = temperature < triggerData.value;
        } else if (triggerData.operator === '>') {
          shouldExecute = temperature > triggerData.value;
        }
      }

      if (!shouldExecute) continue;

      // Action: { deviceId: "...", setStatus: true/false }
      const targetDevice = devices.find(d => d.id === actionData.deviceId);
      if (!targetDevice) continue;
      const desiredStatus = typeof actionData.status === 'boolean'
        ? actionData.status
        : actionData.setStatus;
      if (typeof desiredStatus !== 'boolean') continue;

      // Only act if device is not already in the desired state
      if (targetDevice.status === desiredStatus) continue;

      await updateDevice(targetDevice.id, req.user.id, { status: desiredStatus });

      const statusText = desiredStatus ? 'ВКЛ' : 'ВЫКЛ';
      const logMessage = `⚡ Автоматизация: ${targetDevice.name} ${statusText} (${rule.name})`;

      await addAutomationLog({ userId: req.user.id, message: logMessage });

      // Create notification for automation action
      await addNotification({
        userId: req.user.id,
        title: 'Автоматизация',
        message: `⚡ ${targetDevice.name} ${statusText} (${rule.name})`,
        type: 'info',
        icon: 'auto_awesome'
      });

      executed.push({
        ruleId: rule.id,
        ruleName: rule.name,
        deviceName: targetDevice.name,
        action: statusText
      });
    }

    res.json({ executed });
  } catch (error) {
    console.error('Error executing automation:', error);
    res.status(500).json({ error: 'Failed to execute automation' });
  }
});

// Manual trigger for scheduler (Debug/Testing)
router.post('/execute-now', async (req, res) => {
  try {
    const { checkAndExecuteRules } = require('../services/scheduler');
    const executed = await checkAndExecuteRules();
    res.json({
      success: true,
      message: 'Automation check triggered',
      executedCount: Array.isArray(executed) ? executed.length : 0,
      executed: Array.isArray(executed) ? executed : []
    });
  } catch (error) {
    console.error('Manual execution failed:', error);
    res.status(500).json({ error: 'Manual execution failed' });
  }
});

// Get automation logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await getAutomationLogsByUserId(req.user.id);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation logs' });
  }
});

// Add automation log
router.post('/logs', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const log = await addAutomationLog({
      userId: req.user.id,
      message
    });

    res.status(201).json({ log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add automation log' });
  }
});


module.exports = router;
