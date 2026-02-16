const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { findUserByEmail, updateUser } = require('../state');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);


router.get('/', (req, res) => {

    const user = req.user;

    res.json({
        name: user.name || 'User',
        email: user.email,
        avatar: user.avatar || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(user.name || 'User')}`
    });
});


router.put('/', async (req, res) => {
    const { name, email, avatar } = req.body;
    const user = req.user;

    try {

        if (email && email !== user.email) {
            const emailExists = await findUserByEmail(email);
            if (emailExists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (avatar) updates.avatar = avatar;

        const updatedUser = await updateUser(user.id, updates);

        res.json({
            message: 'Profile updated successfully',
            user: {
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});


router.put('/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }


        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUser(user.id, { password: hashedPassword });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});


router.put('/avatar', async (req, res) => {
    const { avatar } = req.body;
    const user = req.user;

    try {
        const updatedUser = await updateUser(user.id, { avatar });

        res.json({
            message: 'Avatar updated successfully',
            avatar: updatedUser.avatar
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});

module.exports = router;
