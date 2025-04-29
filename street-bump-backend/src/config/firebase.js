require('dotenv').config();

const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

const bucketName = process.env.STORAGE_BUCKET;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: bucketName,
  });
}

const db = admin.firestore();
console.log('Firebase Admin initialized'); // Debug log

const bucket = admin.storage().bucket();
console.log('Firebase Storage initialized', bucketName); // Debug log

module.exports = { admin, db, bucket };