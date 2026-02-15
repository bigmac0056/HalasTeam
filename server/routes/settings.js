const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getHomeMode, setHomeMode } = require('../state');

router.use(authMiddleware);

// Get current home mode
router.get('/mode', async (req, res) => {
    try {
        const mode = await getHomeMode(req.user.id);
        res.json({ mode });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch home mode' });
    }
});

// Update home mode with automatic device safety
router.post('/mode', async (req, res) => {
    const { mode } = req.body;
    const validModes = ['Home', 'Away', 'Night', 'Vacation'];

    if (!validModes.includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode' });
    }

    try {
        const result = await setHomeMode(req.user.id, mode);

        // Result contains { homeMode, message, turnedOff }
        // Notifications are already handled in state.js

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

module.exports = router;
