const { Firestore } = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// Initialize Firebase Admin SDK and related services once
admin.initializeApp();
const firestore = new Firestore();
const storage = new Storage();

module.exports = { admin, firestore, storage };
