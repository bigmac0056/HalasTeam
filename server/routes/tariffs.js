const express = require('express');
const router = express.Router();
const TariffService = require('../services/tariffService');

// GET /api/tariffs/resolve
// Params: lat, lon, monthlyKwh, stoveType, peopleCount
router.get('/resolve', async (req, res) => {
    try {
        const { lat, lon, monthlyKwh, stoveType, peopleCount } = req.query;

        if (!lat || !lon || !monthlyKwh) {
            return res.status(400).json({ error: "Missing required parameters: lat, lon, monthlyKwh" });
        }

        const result = await TariffService.resolveTariff({
            lat: Number(lat),
            lon: Number(lon),
            monthlyKwh: Number(monthlyKwh),
            stoveType: stoveType || 'electric',
            peopleCount: Number(peopleCount) || 1
        });

        res.json(result);
    } catch (error) {
        console.error("Tariff resolve error:", error);
        res.status(500).json({ error: "Internal server error resolving tariffs" });
    }
});

// GET /api/tariffs/providers
router.get('/providers', (req, res) => {
    try {
        const providers = TariffService.getProviders();
        res.json({ providers });
    } catch (error) {
        console.error("Get providers error:", error);
        res.status(500).json({ error: "Failed to fetch providers" });
    }
});

// GET /api/tariffs/supported-cities
router.get('/supported-cities', (req, res) => {
    try {
        const cities = TariffService.getAllSupportedCities();
        res.json({ cities });
    } catch (error) {
        console.error("Get supported cities error:", error);
        res.status(500).json({ error: "Failed to fetch supported cities" });
    }
});

module.exports = router;
