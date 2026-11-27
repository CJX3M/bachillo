const test = require('node:test');
const assert = require('node:assert');
const { fakeDb, fakeRes } = require('./fakeDb');
const { createFixedController } = require('../src/controllers/fixedController');

const NOW = new Date('2026-11-28T15:00:00.000Z');
const bump = (extra) => ({
    imageUrl: 'u', location: { lat: 29, lng: -110 }, createdAt: '2026-11-20T00:00:00.000Z',
    verified: true, fixed: false, ...extra,
});

function setup(docs) {
    const db = fakeDb(docs);
    const controller = createFixedController({ db, now: () => NOW });
    const call = async (name, id) => {
        const res = fakeRes();
        await controller[name]({ params: { id } }, res);
        return res;
    };
    return { db, call };
}

test('getBump returns only the public fields of an approved bump', async () => {
    const { call } = setup({ a: bump({ address: 'Calle 1', secret: 'x', verifiedAt: 'y' }) });
    const res = await call('getBump', 'a');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, {
        id: 'a', imageUrl: 'u', location: { lat: 29, lng: -110 }, address: 'Calle 1',
        createdAt: '2026-11-20T00:00:00.000Z', fixed: false,
    });
});

test('getBump hides unapproved and missing bumps', async () => {
    const { call } = setup({ a: bump({ verified: false }) });
    assert.strictEqual((await call('getBump', 'a')).statusCode, 404);
    assert.strictEqual((await call('getBump', 'nope')).statusCode, 404);
});

test('markFixed stores fixed and fixedAt once', async () => {
    const { db, call } = setup({ a: bump() });
    const res = await call('markFixed', 'a');
    assert.deepStrictEqual(res.body, { id: 'a', fixed: true });
    assert.strictEqual(db.docs.get('a').fixed, true);
    assert.strictEqual(db.docs.get('a').fixedAt, NOW.toISOString());

    const again = await call('markFixed', 'a');
    assert.strictEqual(again.statusCode, 200);
    assert.strictEqual(db.writes.length, 1);
});

test('markFixed refuses unapproved and missing bumps without writing', async () => {
    const { db, call } = setup({ a: bump({ verified: false }) });
    assert.strictEqual((await call('markFixed', 'a')).statusCode, 404);
    assert.strictEqual((await call('markFixed', 'nope')).statusCode, 404);
    assert.strictEqual(db.writes.length, 0);
});

test('listFixed returns fixed bumps, newest first', async () => {
    const { call } = setup({
        old: bump({ fixed: true, fixedAt: '2026-11-01T00:00:00.000Z' }),
        open: bump(),
        recent: bump({ fixed: true, fixedAt: '2026-11-25T00:00:00.000Z' }),
    });
    const res = await call('listFixed');
    assert.deepStrictEqual(res.body.map((b) => b.id), ['recent', 'old']);
});

test('reopen clears fixed; unknown id is 404', async () => {
    const { db, call } = setup({ a: bump({ fixed: true, fixedAt: 'x' }) });
    assert.deepStrictEqual((await call('reopen', 'a')).body, { id: 'a', fixed: false });
    assert.strictEqual(db.docs.get('a').fixed, false);
    assert.strictEqual(db.docs.get('a').fixedAt, null);
    assert.strictEqual((await call('reopen', 'nope')).statusCode, 404);
});

test('Firestore errors become 500', async () => {
    const db = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('down'); } }) }) };
    const res = fakeRes();
    await createFixedController({ db }).getBump({ params: { id: 'a' } }, res);
    assert.strictEqual(res.statusCode, 500);
    assert.ok(res.body.error);
});
