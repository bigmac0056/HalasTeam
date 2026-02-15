const nodemailer = require('nodemailer');

const createTransporter = () => {
    const user = process.env.MAIL_USER;
    const rawPassword = process.env.MAIL_APP_PASSWORD;
    const pass = rawPassword ? rawPassword.replace(/\s+/g, '') : '';

    if (!user || !pass) {
        throw new Error('MAIL_NOT_CONFIGURED: Set MAIL_USER and MAIL_APP_PASSWORD in server environment.');
    }

    return nodemailer.createTransport({
        service: process.env.MAIL_PROVIDER || 'gmail',
        auth: { user, pass }
    });
};

const sendEmail = async (to, subject, text, attachments = []) => {
    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.MAIL_USER,
            to,
            subject,
            text,
            attachments
        });
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        if (error?.message?.startsWith('MAIL_NOT_CONFIGURED')) {
            throw error;
        }
        if (error?.code === 'EAUTH') {
            throw new Error('MAIL_AUTH_FAILED: check MAIL_USER / MAIL_APP_PASSWORD (Gmail App Password).');
        }
        throw new Error(`MAIL_SEND_FAILED: ${error.message}`);
    }
};

module.exports = { sendEmail };
