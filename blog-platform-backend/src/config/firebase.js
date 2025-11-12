const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// In Cloud Run, use Application Default Credentials. If GOOGLE_APPLICATION_CREDENTIALS points
// to a non-existent file (e.g., from local .env), unset it to avoid startup crashes.
try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && !fs.existsSync(credPath)) {
        console.warn('[firebase] GOOGLE_APPLICATION_CREDENTIALS points to a non-existent file. Ignoring in Cloud Run.');
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
} catch { }

// Initialize Firebase Admin SDK and related services once
admin.initializeApp();
const firestore = new Firestore();
const storage = new Storage();

module.exports = { admin, firestore, storage };
