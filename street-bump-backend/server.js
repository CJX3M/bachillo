const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');

// Remove swagger imports and configuration
admin.initializeApp();

const app = express();
const db = admin.firestore();
const bucket = admin.storage().bucket();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: true }));

// Remove swagger setup and routes
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Remove dotenv require and config
// const dotenv = require('dotenv');
// dotenv.config();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600 // 10 minutes
};

app.use(cors(corsOptions));

// Increase payload limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const serviceAccount = require("./serviceAccountKey.json");

// Add after existing middleware
const verifyAdminToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (decodedToken.email !== adminEmail) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply middleware to admin routes
app.use('/api/admin/*', verifyAdminToken);

app.get('/api/bumps/nearby', async (req, res) => {
  const { lat, lng, radius } = req.query;
  const center = new admin.firestore.GeoPoint(parseFloat(lat), parseFloat(lng));
  
  try {
    const bumpsRef = db.collection('bumps');
    const snapshot = await bumpsRef
      .where('location', '>=', calculateBounds(center, radius, 'min'))
      .where('location', '<=', calculateBounds(center, radius, 'max'))
      .get();

    const bumps = [];
    snapshot.forEach(doc => {
      bumps.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(bumps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby bumps' });
  }
});

// POST endpoint - Add verified: false when creating new bump
app.post('/api/bumps', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const file = req.file;
    
    const fileName = `bumps/${lat}_${lng}_${Date.now()}.jpg`;
    const fileBuffer = Buffer.from(file.buffer);
    
    const blob = bucket.file(fileName);
    await blob.save(fileBuffer, {
      contentType: 'image/jpeg'
    });

    const [url] = await blob.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    const docRef = await db.collection('bumps').add({
      location: new admin.firestore.GeoPoint(parseFloat(lat), parseFloat(lng)),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      imageUrl: url,
      verified: false // Add verification field
    });

    res.status(201).json({ id: docRef.id, imageUrl: url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bump report' });
  }
});

// GET endpoint - Only return verified bumps
app.get('/api/bumps', async (req, res) => {
  try {
    const bumpsSnapshot = await db.collection('bumps')
      .where('verified', '==', true)
      .get();
    
    const bumps = [];
    bumpsSnapshot.forEach(doc => {
      bumps.push({ id: doc.id, ...doc.data() });
    });
    res.json(bumps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bumps' });
  }
});

// New endpoint for admin to get unverified bumps
app.get('/api/admin/bumps/unverified', async (req, res) => {
  try {
    const bumpsSnapshot = await db.collection('bumps')
      .where('verified', '==', false)
      .orderBy('timestamp', 'desc')
      .get();
    
    const bumps = [];
    bumpsSnapshot.forEach(doc => {
      bumps.push({ id: doc.id, ...doc.data() });
    });
    res.json(bumps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unverified bumps' });
  }
});

// New endpoint to verify a bump
app.patch('/api/admin/bumps/:id/verify', async (req, res) => {
  try {
    await db.collection('bumps').doc(req.params.id).update({
      verified: true,
      verifiedBy: req.user.email,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify bump' });
  }
});

app.delete('/api/admin/bumps/:id', async (req, res) => {
  try {
    const doc = await db.collection('bumps').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Bump not found' });
    }
    
    const data = doc.data();
    if (data.imageUrl) {
      const fileName = data.imageUrl.split('/').pop();
      await bucket.file(`bumps/${fileName}`).delete();
    }
    
    await doc.ref.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bump' });
  }
});

exports.api = functions.https.onRequest(app);