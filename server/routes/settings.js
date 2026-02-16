const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getHomeMode, setHomeMode, getAutopilotEnabled, setAutopilotEnabled } = require('../state');

router.use(authMiddleware);


router.get('/mode', async (req, res) => {
    try {
        const mode = await getHomeMode(req.user.id);
        res.json({ mode });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch home mode' });
    }
});


router.post('/mode', async (req, res) => {
    const { mode } = req.body;
    const validModes = ['Home', 'Away', 'Night', 'Vacation'];

    if (!validModes.includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode' });
    }

    try {
        const result = await setHomeMode(req.user.id, mode);




        res.json({
            mode: result.homeMode,
            turnedOff: result.turnedOff,
            message: result.message
        });
    } catch (error) {
        console.error('Error updating home mode:', error);
        res.status(500).json({ error: 'Failed to update home mode' });
    }
});

router.get('/autopilot', async (req, res) => {
    try {
        const enabled = await getAutopilotEnabled(req.user.id);
        res.json({ enabled });
    } catch (error) {
        console.error('Error fetching autopilot state:', error);
        res.status(500).json({ error: 'Failed to fetch autopilot state' });
    }
});

router.post('/autopilot', async (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be boolean' });
    }

    try {
        const nextEnabled = await setAutopilotEnabled(req.user.id, enabled);
        res.json({ enabled: nextEnabled });
    } catch (error) {
        console.error('Error updating autopilot state:', error);
        res.status(500).json({ error: 'Failed to update autopilot state' });
    }
});

module.exports = router;
