const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const PUBLIC_BASE_URL = process.env.STORAGE_PUBLIC_BASE_URL || '';

// Ensure uploads dir exists for local storage
if (STORAGE_PROVIDER === 'local' && !fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let s3Client;
if (STORAGE_PROVIDER === 's3') {
    s3Client = new S3Client({
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
}

const uploadFile = async ({ buffer, mimeType, originalName, userId }) => {
    const ext = path.extname(originalName);
    const filename = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const storageKey = `music/${filename}`;

    if (STORAGE_PROVIDER === 'local') {
        const filePath = path.join(UPLOADS_DIR, filename);
        await fs.promises.writeFile(filePath, buffer);
        const trimmedBase = PUBLIC_BASE_URL.trim().replace(/\/$/, '');
        const fileUrl = trimmedBase
            ? `${trimmedBase}/${filename}`
            : `/uploads/${filename}`;

        return {
            fileUrl,
            storageKey: filename, // For local, key is filename
            sizeBytes: buffer.length,
            mimeType
        };
    } else {
        // S3 Upload
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: storageKey,
            Body: buffer,
            ContentType: mimeType,
            ACL: 'public-read' // or private depending on need. For MVP assuming public read or presigned
        });

        await s3Client.send(command);

        // Construct URL - simplistic for now. For R2/S3 usually endpoint/bucket/key
        // But better to use a dedicated PUBLIC_URL env for S3 as well if different from endpoint
        // For MVP assuming standard S3 URL structure or overridden by env
        let fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${storageKey}`;
        if (process.env.STORAGE_PUBLIC_BASE_URL) {
            fileUrl = `${process.env.STORAGE_PUBLIC_BASE_URL}/${storageKey}`;
        }

        return {
            fileUrl,
            storageKey,
            sizeBytes: buffer.length,
            mimeType
        };
    }
};

const deleteFile = async (storageKey) => {
    if (STORAGE_PROVIDER === 'local') {
        const filePath = path.join(UPLOADS_DIR, storageKey);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } else {
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: storageKey,
        });
        await s3Client.send(command);
    }
};

module.exports = {
    uploadFile,
    deleteFile
};
