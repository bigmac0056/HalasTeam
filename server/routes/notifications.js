const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getNotificationsByUserId,
    addNotification,
    markNotificationAsRead,
    clearNotifications
} = require('../state');

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for the user
router.get('/', async (req, res) => {
    try {
        const notifications = await getNotificationsByUserId(req.user.id);
        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Create a new notification (internal use mostly, but exposed for frontend automation logic)
router.post('/', async (req, res) => {
    try {
        const { text, type, icon } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Notification text is required' });
        }

        const notification = await addNotification({
            userId: req.user.id,
            title: 'Уведомление', // Added default title as it might be required by schema or model
            message: text,
            type: type || 'info',
            icon: icon || 'notifications'
        });

        res.status(201).json({ notification });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Mark a notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const success = await markNotificationAsRead(req.params.id, req.user.id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Clear all notifications for the user
router.delete('/', async (req, res) => {
    try {
        await clearNotifications(req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

module.exports = router;
