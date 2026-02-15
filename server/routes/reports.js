const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(authMiddleware);

// Helper to gather report data
const getReportData = async (userId, periodDays) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const logs = await prisma.energyLog.findMany({
        where: {
            userId,
            timestamp: { gte: startDate }
        }
    });

    const totalConsumption = logs.reduce((acc, log) => acc + log.energyConsumed, 0);
    // Mock cost calc for now, should use tariff service ideally
    const totalCost = totalConsumption * 25;
    const avgDaily = totalConsumption / (periodDays || 1);

    // Group by device
    const deviceMap = {};
    logs.forEach(log => {
        const name = log.deviceName || 'Unknown';
        deviceMap[name] = (deviceMap[name] || 0) + log.energyConsumed;
    });

    const topConsumers = Object.entries(deviceMap)
        .map(([name, kwh]) => ({ name, kwh }))
        .sort((a, b) => b.kwh - a.kwh)
        .slice(0, 5);

    // Get active recommendations
    const recommendations = await prisma.aiRecommendation.findMany({
        where: { userId, isDismissed: false, isApplied: false },
        take: 3
    });

    return {
        periodDays,
        totalConsumption,
        totalCost,
        avgDaily,
        topConsumers,
        recommendations
    };
};

router.get('/energy/preview', async (req, res) => {
    try {
        const periodDays = parseInt(req.query.periodDays) || 30;
        const data = await getReportData(req.user.id, periodDays);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/energy/pdf', async (req, res) => {
    try {
        const periodDays = parseInt(req.query.periodDays) || 30;
        const data = await getReportData(req.user.id, periodDays);
        const pdfBuffer = await pdfService.generateEnergyReport(data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=energy_report_${periodDays}d.pdf`);
        res.send(pdfBuffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'PDF generation failed' });
    }
});

router.post('/energy/email', async (req, res) => {
    try {
        const periodDays = req.body.periodDays || 30;
        const email = req.body.email || req.user.email;

        const data = await getReportData(req.user.id, periodDays);
        const pdfBuffer = await pdfService.generateEnergyReport(data);

        await emailService.sendEmail(
            email,
            `SmartSphere Energy Report (${periodDays} days)`,
            `Here is your energy report for the last ${periodDays} days.`,
            [{ filename: `report_${periodDays}d.pdf`, content: pdfBuffer }]
        );

        res.json({ success: true, message: `Report sent to ${email}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
