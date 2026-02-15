const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// Initiate Google OAuth flow
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
const crypto = require('crypto');
const authCodes = new Map(); // Store codes: code -> { token, expires }

// Yahoo! Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        try {
            // Generate short-lived code
            const code = crypto.randomBytes(16).toString('hex');

            // Generate JWT
            const token = jwt.sign(
                { userId: req.user.id, email: req.user.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Store code with 1 min expiration
            authCodes.set(code, { token });
            setTimeout(() => authCodes.delete(code), 60000);

            // Redirect with code
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
        } catch (error) {
            console.error('OAuth callback error:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
        }
    }
);

// Exchange code for token
router.post('/google/exchange', (req, res) => {
    const { code } = req.body;
    if (!code || !authCodes.has(code)) {
        return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const { token } = authCodes.get(code);
    authCodes.delete(code); // One-time use

    res.json({ token });
});

module.exports = router;
