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

const parseLogMetadata = (metadata) => {
  if (!metadata) return null;
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
};

const classifyLog = (log) => {
  const metadata = parseLogMetadata(log.metadata);
  const source = String(metadata?.source || '').toLowerCase();
  const message = String(log.message || '').toLowerCase();

  if (source === 'sensor' || message.includes('тревога')) return 'alert';
  if (source === 'scheduler' || source === 'settings' || source === 'automation') return 'automation';
  if (source === 'manual') return 'manual';

  if (message.includes('автоматизация') || message.includes('режим') || message.includes('автопилот')) {
    return 'automation';
  }

  return 'manual';
};


router.get('/', async (req, res) => {
  try {
    const rules = await getAutomationRulesByUserId(req.user.id);
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});


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


router.delete('/logs', async (req, res) => {
  try {
    const { before, all } = req.query;
    const userId = req.user.id;
    let where = { userId };

    if (all === 'true') {

    } else if (before) {

      const date = new Date(before);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      where.timestamp = { lt: date };
    } else {
      return res.status(400).json({ error: 'Specify ?all=true or ?before=YYYY-MM-DD' });
    }

    const batch = await prisma.automationLog.deleteMany({ where });


    if (batch.count > 0) {
      await addAutomationLog({
        userId,
        message: `🧹 Журнал очищен: удалено ${batch.count} записей`,
        metadata: JSON.stringify({ source: 'manual', type: 'cleanup' })
      });
    }

    res.json({ success: true, count: batch.count });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});


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


router.post('/execute', async (req, res) => {
  try {
    const { temperature } = req.body;
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
        continue;
      }

      let shouldExecute = false;



      if (triggerData.type === 'time') {
        const now = new Date();
        const triggerTime = triggerData.time || triggerData.value;
        if (!triggerTime || typeof triggerTime !== 'string' || !triggerTime.includes(':')) continue;
        const [targetHour, targetMin] = triggerTime.split(':').map(Number);
        const targetMs = targetHour * 3600000 + targetMin * 60000;
        const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;
        const diff = nowMs - targetMs;

        shouldExecute = diff >= 0 && diff < 120000;
      }


      if (triggerData.type === 'temperature' && temperature !== undefined) {
        if (triggerData.operator === '<') {
          shouldExecute = temperature < triggerData.value;
        } else if (triggerData.operator === '>') {
          shouldExecute = temperature > triggerData.value;
        }
      }

      if (!shouldExecute) continue;


      const targetDevice = devices.find(d => d.id === actionData.deviceId);
      if (!targetDevice) continue;
      const desiredStatus = typeof actionData.status === 'boolean'
        ? actionData.status
        : actionData.setStatus;
      if (typeof desiredStatus !== 'boolean') continue;


      if (targetDevice.status === desiredStatus) continue;

      await updateDevice(targetDevice.id, req.user.id, { status: desiredStatus });

      const statusText = desiredStatus ? 'ВКЛ' : 'ВЫКЛ';
      const logMessage = `⚡ Автоматизация: ${targetDevice.name} ${statusText} (${rule.name})`;

      await addAutomationLog({
        userId: req.user.id,
        message: logMessage,
        metadata: JSON.stringify({
          source: 'automation',
          ruleId: rule.id,
          triggerType: triggerData.type || 'unknown',
          deviceId: targetDevice.id,
          desiredStatus
        })
      });

      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date() }
      });

      if (triggerData?.once === true) {
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { enabled: false }
        });

        await addAutomationLog({
          userId: req.user.id,
          message: `Одноразовое правило "${rule.name}" выполнено и отключено`,
          metadata: JSON.stringify({
            source: 'automation',
            ruleId: rule.id,
            type: 'one_time_completed'
          })
        });
      }


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


router.get('/logs', async (req, res) => {
  try {
    const type = String(req.query.type || 'all').toLowerCase();
    const allowedTypes = new Set(['all', 'alert', 'automation', 'manual']);
    const safeType = allowedTypes.has(type) ? type : 'all';

    const logs = await getAutomationLogsByUserId(req.user.id);
    const enrichedLogs = (Array.isArray(logs) ? logs : []).map((log) => ({
      ...log,
      category: classifyLog(log)
    }));

    const filteredLogs = safeType === 'all'
      ? enrichedLogs
      : enrichedLogs.filter((log) => log.category === safeType);

    res.json({ logs: filteredLogs, selectedType: safeType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation logs' });
  }
});


router.post('/logs', async (req, res) => {
  try {
    const { message, metadata } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const providedMetadata = parseLogMetadata(metadata);
    const resolvedMetadata = {
      source: 'manual',
      ...(providedMetadata || {})
    };

    const log = await addAutomationLog({
      userId: req.user.id,
      message,
      metadata: JSON.stringify(resolvedMetadata)
    });

    res.status(201).json({ log });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add automation log' });
  }
});


module.exports = router;
