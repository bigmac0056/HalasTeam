const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const TariffService = require('../services/tariffService');
const aiService = require('../services/aiAdvisorService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(authMiddleware);


const getReportData = async (userId, periodDays, options = {}) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const logs = await prisma.energyLog.findMany({
        where: {
            userId,
            timestamp: { gte: startDate }
        }
    });

    const logsConsumption = logs.reduce((acc, log) => acc + log.energyConsumed, 0);
    const overrideConsumption = Number(options.consumptionKwh);
    const totalConsumption = Number.isFinite(overrideConsumption) && overrideConsumption >= 0
        ? overrideConsumption
        : logsConsumption;
    const avgDaily = totalConsumption / (periodDays || 1);

    const lat = Number(options.lat);
    const lon = Number(options.lon);
    const peopleCount = Math.max(1, Number(options.peopleCount) || 1);
    const stoveType = options.stoveType === 'gas' ? 'gas' : 'electric';
    const canResolveTariff = Number.isFinite(lat) && Number.isFinite(lon);

    let totalCost = 0;
    let tariff = null;

    if (canResolveTariff) {
        tariff = await TariffService.resolveTariff({
            lat,
            lon,
            monthlyKwh: Math.max(totalConsumption, 1),
            stoveType,
            peopleCount
        });

        if (typeof tariff?.totalKzt === 'number') {
            totalCost = tariff.totalKzt;
        } else {



        }
    } else {








    }


    const deviceMap = {};
    logs.forEach(log => {
        const name = log.deviceName || 'Unknown';
        deviceMap[name] = (deviceMap[name] || 0) + log.energyConsumed;
    });

    const topConsumers = Object.entries(deviceMap)
        .map(([name, kwh]) => ({ name, kwh }))
        .sort((a, b) => b.kwh - a.kwh)
        .slice(0, 5);


    let recommendations = [];
    try {
        recommendations = await aiService.generateRecommendations(userId);
    } catch (error) {
        console.error('AI recommendations refresh failed during report generation:', error.message);
        recommendations = await prisma.aiRecommendation.findMany({
            where: { userId, isDismissed: false, isApplied: false },
            orderBy: { priority: 'desc' },
            take: 3
        });
    }

    return {
        periodDays,
        totalConsumption,
        totalCost,
        avgDaily,
        topConsumers,
        recommendations: recommendations.slice(0, 5),
        tariff: tariff
            ? {
                city: tariff.city,
                region: tariff.region,
                provider: tariff.provider,
                totalKzt: tariff.totalKzt
            }
            : null
    };
};

router.get('/energy/preview', async (req, res) => {
    try {
        const periodDays = parseInt(req.query.periodDays) || 30;
        const data = await getReportData(req.user.id, periodDays, {
            lat: req.query.lat,
            lon: req.query.lon,
            stoveType: req.query.stoveType,
            peopleCount: req.query.peopleCount,
            consumptionKwh: req.query.consumptionKwh
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/energy/pdf', async (req, res) => {
    try {
        const periodDays = parseInt(req.query.periodDays) || 30;
        const data = await getReportData(req.user.id, periodDays, {
            lat: req.query.lat,
            lon: req.query.lon,
            stoveType: req.query.stoveType,
            peopleCount: req.query.peopleCount,
            consumptionKwh: req.query.consumptionKwh
        });
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

        const data = await getReportData(req.user.id, periodDays, {
            lat: req.body.lat,
            lon: req.body.lon,
            stoveType: req.body.stoveType,
            peopleCount: req.body.peopleCount,
            consumptionKwh: req.body.consumptionKwh
        });
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
