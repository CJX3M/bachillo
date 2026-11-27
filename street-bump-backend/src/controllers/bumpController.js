const { db, bucket } = require('../config/firebase');
const sharp = require('sharp');
const { selectNearby } = require('../services/nearby');
const { permanentPhotoUrl } = require('../services/photoUrl');

// Old bumps stored signed URLs that have since expired.
const withPermanentPhoto = (bump) => ({ ...bump, imageUrl: permanentPhotoUrl(bump.imageUrl, bucket.name) });

const bumpController = {
    // Get all verified bumps
    getVerifiedBumps: async (req, res) => {
        try {
            const bumpsSnapshot = await db.collection('bumps')
                .where('verified', '==', true)
                .where('fixed', '==', false)
                .get();
            
            const bumps = [];
            bumpsSnapshot.forEach(doc => {
                bumps.push({ id: doc.id, ...doc.data() });
            });
            
            res.json(bumps.map(withPermanentPhoto));
        } catch (error) {
            console.error('Error fetching verified bumps:', error);
            res.status(500).json({ error: 'Failed to fetch bumps' });
        }
    },

    // Create a new bump
    createBump: async (req, res) => {
        try {
            const { image, lat, lng, address } = req.body;
            
            if (!image || !lat || !lng) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const createBumpImage = async (base64String, reqHostname) => {
                try {
                    if (!base64String) {
                        throw new Error('Base64 string is empty');
                    }
                    if (!base64String?.startsWith("data:image/")) {
                        throw new Error("Invalid base64 image data");
                    }

                    const base64Data = base64String.split(",")[1];
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    console.log('Image buffer size:', imageBuffer.length); // Debug log
                    const resizedImageBuffer = await sharp(imageBuffer)
                        .resize({ width: 800, height: 600, fit: 'inside' })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                    console.log('Resized image buffer size:', resizedImageBuffer.length); // Debug log
                    const fileName = `bumps/${Date.now()}.jpg`;
                    const file = bucket.file(fileName);
                    console.log('File name:', fileName); // Debug log
                    await file.save(resizedImageBuffer, {
                        metadata: { contentType: 'image/jpeg' },
                        public: true,
                        validation: 'md5',
                    });
                    console.log('File saved to bucket:', fileName); // Debug log
                    // The file is public (public: true above), so use its permanent public
                    // URL. A signed URL was used here before, but with a 24h expiry it made
                    // every bump image stop loading a day after it was reported.
                    // Under the Storage emulator the object lives on the emulator, not on
                    // storage.googleapis.com. Use the hostname the client reached us at so
                    // other devices on the LAN (e.g. a phone) can load the image too.
                    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
                    const publicUrl = emulatorHost
                        ? `http://${reqHostname || emulatorHost.split(':')[0]}:${emulatorHost.split(':')[1]}/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`
                        : `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    console.log('Public URL:', publicUrl); // Debug log
                    return publicUrl;
                } catch (error) {
                    console.error('Error creating bump image:', error);
                    throw new Error('Failed to create bump image');
                }
            };

            const imgUrl = await createBumpImage(image, req.hostname);

            const bumpData = {
                imageUrl: imgUrl,
                location: { lat, lng },
                verified: false,
                createdAt: new Date().toISOString(),
                fixed: false
            };

            // Reverse-geocoded by the client once at report time, so the map doesn't
            // have to geocode every bump on every load. Optional and length-capped.
            if (typeof address === 'string' && address.trim()) {
                bumpData.address = address.trim().slice(0, 300);
            }

            const docRef = await db.collection('bumps').add(bumpData);
            res.status(201).json({ id: docRef.id, ...bumpData });
            
        } catch (error) {
            console.error('Error creating bump:', error);
            res.status(500).json({ error: 'Failed to create bump' });
        }
    },

    // Get nearby bumps
    getNearbyBumps: async (req, res) => {
        try {
            const { lat, lng, radius = 5 } = req.query;
            
            if (!lat || !lng) {
                return res.status(400).json({ error: 'Missing coordinates' });
            }

            const centerLat = parseFloat(lat);
            const centerLng = parseFloat(lng);
            const radiusKm = parseFloat(radius);

            const bumpsSnapshot = await db.collection('bumps')
                .where('verified', '==', true)
                .get();
            
            const bumps = [];
            bumpsSnapshot.forEach(doc => {
                bumps.push({ id: doc.id, ...doc.data() });
            });

            res.json(selectNearby(bumps, { lat: centerLat, lng: centerLng }, radiusKm).map(withPermanentPhoto));
        } catch (error) {
            console.error('Error fetching nearby bumps:', error);
            res.status(500).json({ error: 'Failed to fetch nearby bumps' });
        }
    },

    // Get all unverified bumps
    getUnverifiedBumps: async (req, res) => {
        try {
            const bumpsSnapshot = await db.collection('bumps')
                .where('verified', '==', false)
                .orderBy('createdAt', 'desc')
                .get();
            
            const bumps = [];
            bumpsSnapshot.forEach(doc => {
                bumps.push({ id: doc.id, ...doc.data() });
            });
            
            res.json(bumps.map(withPermanentPhoto));
        } catch (error) {
            console.error('Error fetching unverified bumps:', error);
            res.status(500).json({ error: 'Failed to fetch unverified bumps' });
        }
    },

    // Verify a bump
    verifyBump: async (req, res) => {
        try {
            const { id } = req.params;
            await db.collection('bumps').doc(id).update({
                verified: true,
                verifiedAt: new Date().toISOString()
            });
            res.json({ message: 'Bump verified successfully' });
        } catch (error) {
            console.error('Error verifying bump:', error);
            res.status(500).json({ error: 'Failed to verify bump' });
        }
    },

    // Delete a bump
    deleteBump: async (req, res) => {
        try {
            const { id } = req.params;
            await db.collection('bumps').doc(id).delete();
            res.json({ message: 'Bump deleted successfully' });
        } catch (error) {
            console.error('Error deleting bump:', error);
            res.status(500).json({ error: 'Failed to delete bump' });
        }
    },
};

module.exports = bumpController;
