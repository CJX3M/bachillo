const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({
  credential: admin.credential.cert(require("../../serviceAccountKey.json")),
  storageBucket: 'bachillo.appspot.com'
});

const db = getFirestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };