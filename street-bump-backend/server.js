require('dotenv').config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const multer = require('multer');

const app = express();

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

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Street Bump API',
      version: '1.0.0',
      description: 'API for reporting and viewing street bumps'
    },
    servers: [
      {
        url: 'http://localhost:3001'
      }
    ]
  },
  apis: ['./server.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Swagger documentation for endpoints
/**
 * @swagger
 * /api/bumps:
 *   get:
 *     summary: Get all verified bumps
 *     responses:
 *       200:
 *         description: List of verified bumps
 *   post:
 *     summary: Create a new bump report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 * 
 * /api/bumps/nearby:
 *   get:
 *     summary: Get bumps within radius
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         required: true
 *         schema:
 *           type: number
 *
 * /api/admin/bumps/unverified:
 *   get:
 *     summary: Get unverified bumps
 *     security:
 *       - BearerAuth: []
 *
 * /api/admin/bumps/{id}/verify:
 *   patch:
 *     summary: Verify a bump
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 * /api/admin/bumps/{id}:
 *   delete:
 *     summary: Delete a bump
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const upload = multer({ storage: multer.memoryStorage() });

// Add after existing middleware
const verifyAdminToken = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const token = req.headers.authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.email !== process.env.ADMIN_EMAIL) {
      throw new Error('Unauthorized email');
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

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
app.get('/api/admin/bumps/unverified', verifyAdminToken, async (req, res) => {
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
app.patch('/api/admin/bumps/:id/verify', verifyAdminToken, async (req, res) => {
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

app.delete('/api/admin/bumps/:id', verifyAdminToken, async (req, res) => {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});