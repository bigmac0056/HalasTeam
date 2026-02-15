const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const aiService = require('../services/aiAdvisorService');

router.use(authMiddleware);

router.get('/recommendations', async (req, res) => {
    try {
        const recs = await aiService.generateRecommendations(req.user.id);
        res.json(recs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/actions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const actions = await aiService.getActionLogs(req.user.id, limit);
        res.json({ actions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/recommendations/:id/apply', async (req, res) => {
    try {
        const result = await aiService.applyRecommendation(req.user.id, req.params.id);
        res.json({ success: true, result });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/recommendations/:id/dismiss', async (req, res) => {
    try {
        await aiService.dismissRecommendation(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
