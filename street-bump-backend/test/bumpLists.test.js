const test = require('node:test');
const assert = require('node:assert');
const { fakeDb, fakeRes } = require('./fakeDb');

const SIGNED = 'https://storage.googleapis.com/b/bumps/1.jpg?Expires=1&Signature=x';
const PERMANENT = 'https://storage.googleapis.com/b/bumps/1.jpg';

const bump = (extra) => ({
    imageUrl: SIGNED, location: { lat: 29.07, lng: -110.95 },
    createdAt: '2025-09-08T00:00:00.000Z', verified: true, fixed: false, ...extra,
});

// The controller reads Firebase from the config module: swap it before loading.
const db = fakeDb({ approved: bump(), pending: bump({ verified: false }) });
const configPath = require.resolve('../src/config/firebase');
require.cache[configPath] = {
    id: configPath, filename: configPath, loaded: true,
    exports: { db, bucket: { name: 'b' } },
};
const controller = require('../src/controllers/bumpController');

for (const [name, query, id] of [
    ['getVerifiedBumps', {}, 'approved'],
    ['getNearbyBumps', { lat: '29.07', lng: '-110.95' }, 'approved'],
    ['getUnverifiedBumps', {}, 'pending'],
]) {
    test(`${name} replaces expired signed photo URLs`, async () => {
        const res = fakeRes();
        await controller[name]({ query }, res);
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body.map((b) => [b.id, b.imageUrl]), [[id, PERMANENT]]);
    });
}
