// "Marked as fixed" flow: public lookup and marking, admin listing and reopening.
function createFixedController({ db, now = () => new Date() }) {
    const bumpRef = (id) => db.collection('bumps').doc(id);

    const handle = (name, fn) => async (req, res) => {
        try {
            await fn(req, res);
        } catch (error) {
            console.error(`Error in ${name}:`, error);
            res.status(500).json({ error: 'Failed to process bump' });
        }
    };

    const notFound = (res) => res.status(404).json({ error: 'Bump not found' });

    return {
        getBump: handle('getBump', async (req, res) => {
            const snap = await bumpRef(req.params.id).get();
            // Unapproved bumps are not public: answer as if they did not exist.
            if (!snap.exists || snap.data().verified !== true) return notFound(res);
            const { imageUrl, location, address, createdAt, fixed } = snap.data();
            res.json({
                id: snap.id,
                imageUrl,
                location,
                ...(address ? { address } : {}),
                createdAt,
                fixed: fixed === true,
            });
        }),

        markFixed: handle('markFixed', async (req, res) => {
            const ref = bumpRef(req.params.id);
            const snap = await ref.get();
            if (!snap.exists || snap.data().verified !== true) return notFound(res);
            // Keep the first fixedAt if someone else already marked it.
            if (snap.data().fixed !== true) {
                await ref.update({ fixed: true, fixedAt: now().toISOString() });
            }
            res.json({ id: req.params.id, fixed: true });
        }),

        listFixed: handle('listFixed', async (req, res) => {
            const snapshot = await db.collection('bumps').where('fixed', '==', true).get();
            const bumps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            // Sorted here so no composite Firestore index is needed.
            bumps.sort((a, b) => (b.fixedAt || '').localeCompare(a.fixedAt || ''));
            res.json(bumps);
        }),

        reopen: handle('reopen', async (req, res) => {
            const ref = bumpRef(req.params.id);
            if (!(await ref.get()).exists) return notFound(res);
            await ref.update({ fixed: false, fixedAt: null });
            res.json({ id: req.params.id, fixed: false });
        }),
    };
}

module.exports = { createFixedController };
