// In-memory, per-instance limit. Good enough to stop casual mass clicking.
function createRateLimit({ limit, windowMs, now = Date.now }) {
    const hits = new Map();

    return (req, res, next) => {
        const time = now();
        for (const [key, entry] of hits) {
            if (time - entry.start > windowMs) hits.delete(key);
        }

        // Only the last X-Forwarded-For entry is appended by Google's front end;
        // anything before it can be forged by the client.
        const forwarded = req.headers['x-forwarded-for'];
        const client = forwarded?.split(',').pop().trim() || req.ip;

        const entry = hits.get(client) || { start: time, count: 0 };
        if (entry.count >= limit) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        entry.count += 1;
        hits.set(client, entry);
        next();
    };
}

module.exports = { createRateLimit };
