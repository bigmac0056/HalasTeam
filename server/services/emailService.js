const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const createTransporter = () => {
    // Check transport mode
    const transport = process.env.MAIL_TRANSPORT || 'smtp'; // 'smtp' or 'resend'

    if (transport === 'resend') {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('MAIL_NOT_CONFIGURED: RESEND_API_KEY is missing.');
        }
        return new Resend(apiKey);
    }

    // SMTP Fallback
    const user = process.env.MAIL_USER;
    const rawPassword = process.env.MAIL_APP_PASSWORD;
    const pass = rawPassword ? rawPassword.replace(/\s+/g, '') : '';

    if (!user || !pass) {
        throw new Error('MAIL_NOT_CONFIGURED: Set MAIL_USER and MAIL_APP_PASSWORD in server environment.');
    }

    return nodemailer.createTransport({
        service: process.env.MAIL_PROVIDER || 'gmail',
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.MAIL_PORT) || 587,
        secure: process.env.MAIL_SECURE === 'true',
        auth: { user, pass }
    });
};

const sendEmail = async (to, subject, text, attachments = []) => {
    try {
        const transport = process.env.MAIL_TRANSPORT || 'smtp';

        if (transport === 'resend') {
            const resend = createTransporter();
            const from = process.env.MAIL_FROM || 'SmartSphere <onboarding@resend.dev>';

            // Convert attachments for Resend
            // Resend expects { filename, content } where content is Buffer
            const resendAttachments = attachments.map(a => ({
                filename: a.filename,
                content: a.content
            }));

            const { data, error } = await resend.emails.send({
                from,
                to: [to],
                subject,
                text,
                attachments: resendAttachments
            });

            if (error) {
                console.error('Resend Error:', error);
                throw new Error(`MAIL_SEND_FAILED: ${error.message}`);
            }

            console.log('Email sent via Resend:', data.id);
            return true;
        }

        // SMTP
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.MAIL_USER,
            to,
            subject,
            text,
            attachments
        });
        console.log('Email sent via SMTP:', info.messageId);
        return true;

    } catch (error) {
        console.error('Error sending email:', error);

        if (error?.message?.startsWith('MAIL_NOT_CONFIGURED')) {
            throw error;
        }
        if (error?.code === 'EAUTH') {
            throw new Error('MAIL_AUTH_FAILED: check MAIL_USER / MAIL_APP_PASSWORD.');
        }
        throw new Error(`MAIL_SEND_FAILED: ${error.message}`);
    }
};

module.exports = { sendEmail };
