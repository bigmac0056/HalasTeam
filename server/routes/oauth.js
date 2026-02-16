const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');


router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));


const crypto = require('crypto');
const authCodes = new Map();


router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        try {

            const code = crypto.randomBytes(16).toString('hex');


            const token = jwt.sign(
                { userId: req.user.id, email: req.user.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );


            authCodes.set(code, { token });
            setTimeout(() => authCodes.delete(code), 60000);


            const frontendUrl = process.env.FRONTEND_URL;
            if (!frontendUrl) {
                console.error("FATAL: FRONTEND_URL is not defined.");
                return res.status(500).send("Server Configuration Error: FRONTEND_URL missing");
            }

            res.redirect(`${frontendUrl}/oauth/callback?code=${code}`);
        } catch (error) {
            console.error('OAuth callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL;
            if (frontendUrl) {
                res.redirect(`${frontendUrl}/login?error=oauth_failed`);
            } else {
                res.status(500).send("OAuth Failed and FRONTEND_URL missing");
            }
        }
    }
);


router.post('/google/exchange', (req, res) => {
    const { code } = req.body;
    if (!code || !authCodes.has(code)) {
        return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const { token } = authCodes.get(code);
    authCodes.delete(code);

    res.json({ token });
});

module.exports = router;
