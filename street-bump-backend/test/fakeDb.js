// Minimal in-memory stand-in for the parts of Firestore the backend uses.
const OPS = {
    '==': (a, b) => a === b,
    '>=': (a, b) => a !== undefined && a >= b,
    '<': (a, b) => a !== undefined && a < b,
};

function fakeDb(docsById = {}) {
    const docs = new Map(Object.entries(docsById).map(([id, data]) => [id, { ...data }]));
    const writes = [];

    const snapshot = (id) => ({
        id,
        exists: docs.has(id),
        data: () => (docs.has(id) ? { ...docs.get(id) } : undefined),
    });

    const query = (filters) => ({
        where: (field, op, value) => query([...filters, [field, op, value]]),
        get: async () => {
            const matches = [...docs.keys()].filter((id) =>
                filters.every(([field, op, value]) => OPS[op](docs.get(id)[field], value)));
            const snaps = matches.map(snapshot);
            return { docs: snaps, forEach: (fn) => snaps.forEach(fn) };
        },
    });

    return {
        docs,
        writes,
        collection: () => ({
            ...query([]),
            doc: (id) => ({
                get: async () => snapshot(id),
                update: async (changes) => {
                    writes.push({ id, changes });
                    docs.set(id, { ...docs.get(id), ...changes });
                },
            }),
        }),
    };
}

// Express `res` double that records what the handler sent.
function fakeRes() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        set(name, value) { this.headers[name] = value; return this; },
        json(body) { this.body = body; return this; },
        send(body) { this.body = body; return this; },
    };
}

module.exports = { fakeDb, fakeRes };
