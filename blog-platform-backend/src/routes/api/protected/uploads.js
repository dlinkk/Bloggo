const express = require('express');
const { storage } = require('../../../config/firebase');
const { UPLOAD_BUCKET } = require('../../../config/app');

const router = express.Router();

// POST /api/generate-upload-url
router.post('/generate-upload-url', async (req, res) => {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) return res.status(400).json({ message: 'Filename and contentType are required.' });
    try {
        const bucketName = UPLOAD_BUCKET; // same behavior as previous hardcoded bucket
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`${req.user.uid}/${Date.now()}-${filename}`);
        const options = { version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: contentType };
        const [signedUrl] = await file.getSignedUrl(options);
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${file.name}`;
        res.status(200).json({ signedUrl, publicUrl });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ message: 'Could not create upload URL.' });
    }
});

module.exports = router;
