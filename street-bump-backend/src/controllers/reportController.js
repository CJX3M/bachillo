const { yesterdayRange } = require('../services/yesterday');
const { permanentPhotoUrl } = require('../services/photoUrl');
const { renderReportPage } = require('../services/reportPage');

// LocationIQ's free plan allows 2 requests per second.
const GEOCODE_GAP_MS = 600;
// Hosting cuts rewritten requests at 60s: stop looking up addresses well before.
const GEOCODE_BUDGET_MS = 20000;

// Bumps approved during the previous Hermosillo day that are still unfixed.
async function getYesterdayBumps({ db, now = () => new Date() }) {
    const { from, to } = yesterdayRange(now());
    const snapshot = await db.collection('bumps')
        .where('verifiedAt', '>=', from)
        .where('verifiedAt', '<', to)
        .get();
    // The other conditions are applied here so no composite index is needed.
    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((bump) => bump.verified === true && bump.fixed !== true)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function createReportHandler({
    db,
    now = () => new Date(),
    reverseGeocode,
    baseUrl,
    bucketName,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    clock = Date.now,
}) {
    // Older bumps have no stored address: resolve it once and keep it.
    const addMissingAddresses = async (bumps) => {
        const start = clock();
        let calls = 0;
        for (const bump of bumps) {
            if (bump.address) continue;
            // The rest show coordinates now and are resolved on a later visit.
            if (clock() - start >= GEOCODE_BUDGET_MS) break;
            if (calls++) await sleep(GEOCODE_GAP_MS);
            try {
                const address = await reverseGeocode(bump.location.lat, bump.location.lng);
                if (!address) continue;
                bump.address = address.slice(0, 300);
                await db.collection('bumps').doc(bump.id).update({ address: bump.address });
            } catch (error) {
                // The page falls back to coordinates.
                console.error(`Could not resolve address for ${bump.id}:`, error.message);
            }
        }
    };

    return async (req, res) => {
        try {
            const bumps = await getYesterdayBumps({ db, now });
            await addMissingAddresses(bumps);
            const html = renderReportPage({
                bumps: bumps.map((bump) => ({ ...bump, imageUrl: permanentPhotoUrl(bump.imageUrl, bucketName) })),
                baseUrl,
            });
            res.set('Cache-Control', 'public, max-age=60').send(html);
        } catch (error) {
            console.error('Error building the report page:', error);
            res.status(500).send('<!DOCTYPE html><html lang="es"><meta charset="utf-8"><p>No se pudo cargar la lista. Intenta más tarde.</p></html>');
        }
    };
}

module.exports = { getYesterdayBumps, createReportHandler };
