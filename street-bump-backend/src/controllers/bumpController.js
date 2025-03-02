const { db, bucket } = require('../config/firebase');

const bumpController = {
    // Get all verified bumps
    getVerifiedBumps: async (req, res) => {
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

            const bumpData = {
                imageUrl: image,
                location: { lat, lng },
                verified: false,
                createdAt: new Date().toISOString()
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

            const bumpsSnapshot = await db.collection('bumps')
                .where('verified', '==', true)
                .get();
            
            const centerLat = parseFloat(lat);
            const centerLng = parseFloat(lng);
            const radiusKm = parseFloat(radius);

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
    }
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