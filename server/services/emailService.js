const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.MAIL_PROVIDER || 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_APP_PASSWORD
    }
});

const sendEmail = async (to, subject, text, attachments = []) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_APP_PASSWORD) {
        console.warn('Mail credentials not provided. Skipping email send.');
        return false;
    }

    try {
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
        throw error;
    }
};

module.exports = { sendEmail };
