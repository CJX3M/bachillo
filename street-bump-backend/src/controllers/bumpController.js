const { db, bucket } = require('../config/firebase');
const sharp = require('sharp');

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
            
            res.json(bumps);
        } catch (error) {
            console.error('Error fetching verified bumps:', error);
            res.status(500).json({ error: 'Failed to fetch bumps' });
        }
    },

    // Create a new bump
    createBump: async (req, res) => {
        try {
            const { image, lat, lng } = req.body;
            
            if (!image || !lat || !lng) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const createBumpImage = async (base64String) => {
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
                    const [publicUrl] = await file.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 24 * 60 * 60 * 1000, // 1 day
                    });
                    console.log('Public URL:', publicUrl); // Debug log
                    return publicUrl;
                } catch (error) {
                    console.error('Error creating bump image:', error);
                    throw new Error('Failed to create bump image');
                }
            };

            const imgUrl = await createBumpImage(image);

            const bumpData = {
                imageUrl: imgUrl,
                location: { lat, lng },
                verified: false,
                createdAt: new Date().toISOString(),
                fixed: false
            };

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
                const bump = { id: doc.id, ...doc.data() };
                const distance = calculateDistance(
                    centerLat,
                    centerLng,
                    bump.location.lat,
                    bump.location.lng
                );
                
                if (distance <= radiusKm) {
                    bumps.push({ ...bump, distance });
                }
            });
            
            res.json(bumps.sort((a, b) => a.distance - b.distance));
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
            
            res.json(bumps);
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

// Helper function to calculate distance between coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

module.exports = bumpController;