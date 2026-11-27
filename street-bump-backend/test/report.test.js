const test = require('node:test');
const assert = require('node:assert');
const { fakeDb, fakeRes } = require('./fakeDb');
const { yesterdayRange } = require('../src/services/yesterday');
const { permanentPhotoUrl } = require('../src/services/photoUrl');
const { createReverseGeocoder } = require('../src/services/serverGeocoding');
const { renderReportPage } = require('../src/services/reportPage');
const { getYesterdayBumps, createReportHandler } = require('../src/controllers/reportController');

const NOW = new Date('2026-11-28T15:00:00.000Z');
const BASE = 'https://ejemplo.test';
const bump = (extra) => ({
    imageUrl: 'https://storage.googleapis.com/b/bumps/1.jpg', location: { lat: 29.07, lng: -110.95 },
    createdAt: '2026-11-20T18:00:00.000Z', verified: true, fixed: false,
    verifiedAt: '2026-11-27T18:00:00.000Z', address: 'Calle 1', ...extra,
});

test('yesterdayRange covers the previous Hermosillo day', () => {
    assert.deepStrictEqual(yesterdayRange(NOW), {
        from: '2026-11-27T07:00:00.000Z', to: '2026-11-28T07:00:00.000Z', day: '2026-11-27',
    });
});

test('yesterdayRange just before local midnight is still the day before', () => {
    assert.strictEqual(yesterdayRange(new Date('2026-11-28T06:59:59Z')).day, '2026-11-26');
});

test('getYesterdayBumps respects the boundaries and skips fixed and pending', async () => {
    const db = fakeDb({
        start: bump({ verifiedAt: '2026-11-27T07:00:00.000Z', createdAt: '2026-11-21T00:00:00.000Z' }),
        end: bump({ verifiedAt: '2026-11-28T06:59:59.999Z', createdAt: '2026-11-19T00:00:00.000Z' }),
        next: bump({ verifiedAt: '2026-11-28T07:00:00.000Z' }),
        fixed: bump({ fixed: true }),
        pending: bump({ verified: false }),
    });
    const result = await getYesterdayBumps({ db, now: () => NOW });
    assert.deepStrictEqual(result.map((b) => b.id), ['end', 'start']);
});

test('permanentPhotoUrl drops the signature of expired signed URLs only', () => {
    assert.strictEqual(
        permanentPhotoUrl('https://storage.googleapis.com/b/bumps/1.jpg?Expires=1&Signature=x', 'b'),
        'https://storage.googleapis.com/b/bumps/1.jpg');
    const emulator = 'http://127.0.0.1:9199/v0/b/b/o/bumps%2F1.jpg?alt=media';
    assert.strictEqual(permanentPhotoUrl(emulator, 'b'), emulator);
});

test('addresses are shown as text, never as HTML', () => {
    const html = renderReportPage({
        bumps: [{ id: 'a', ...bump({ address: '<img src=x onerror=alert(1)>"' }) }], baseUrl: BASE,
    });
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;img src=x'));
});

test('page has preview metadata and a map link per bump', () => {
    const html = renderReportPage({
        bumps: [
            { id: 'a', ...bump({ imageUrl: 'https://fotos.test/primera.jpg' }) },
            { id: 'b', ...bump() },
        ],
        baseUrl: BASE,
    });
    assert.match(html, /property="og:title" content="[^"]*2 baches/);
    assert.ok(html.includes('property="og:image" content="https://fotos.test/primera.jpg"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes('href="https://ejemplo.test/?bache=a"'));
});

test('singular title for one bump and empty message for none', () => {
    const one = renderReportPage({ bumps: [{ id: 'a', ...bump() }], baseUrl: BASE });
    assert.match(one, /1 bache[^s]/);
    const none = renderReportPage({ bumps: [], baseUrl: BASE });
    assert.ok(none.includes('No hubo baches nuevos ayer'));
    assert.ok(none.includes('href="https://ejemplo.test"'));
});

async function render(docs, reverseGeocode) {
    const db = fakeDb(docs);
    const res = fakeRes();
    const handler = createReportHandler({
        db, now: () => NOW, reverseGeocode, baseUrl: BASE, bucketName: 'b', sleep: async () => {},
    });
    await handler({}, res);
    return { db, res };
}

test('handler resolves a missing address once and stores it', async () => {
    const { db, res } = await render({ a: bump({ address: undefined }) }, async () => 'Av. Nueva 5');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.includes('Av. Nueva 5'));
    assert.strictEqual(db.docs.get('a').address, 'Av. Nueva 5');
    assert.strictEqual(res.headers['Cache-Control'], 'public, max-age=60');
});

for (const [name, geocoder] of [
    ['returns nothing', async () => null],
    ['throws', async () => { throw new Error('down'); }],
]) {
    test(`handler shows coordinates when geocoding ${name}`, async () => {
        const { db, res } = await render({ a: bump({ address: undefined }) }, geocoder);
        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.body.includes('29.07000, -110.95000'));
        assert.strictEqual(db.writes.length, 0);
    });
}

test('handler answers 500 with HTML when the database fails', async () => {
    const res = fakeRes();
    const db = { collection: () => { throw new Error('down'); } };
    await createReportHandler({ db, now: () => NOW, reverseGeocode: async () => null, baseUrl: BASE, bucketName: 'b' })({}, res);
    assert.strictEqual(res.statusCode, 500);
    assert.ok(res.body.includes('<html'));
});

test('geocoder without a key does not call the service', async () => {
    let calls = 0;
    const geocode = createReverseGeocoder({ apiKey: undefined, fetchImpl: async () => { calls += 1; } });
    assert.strictEqual(await geocode(29, -110), null);
    assert.strictEqual(calls, 0);
});

test('geocoder returns display_name, or null on an error response', async () => {
    const ok = createReverseGeocoder({
        apiKey: 'k', fetchImpl: async () => ({ ok: true, json: async () => ({ display_name: 'Calle 2' }) }),
    });
    assert.strictEqual(await ok(29, -110), 'Calle 2');
    const bad = createReverseGeocoder({ apiKey: 'k', fetchImpl: async () => ({ ok: false }) });
    assert.strictEqual(await bad(29, -110), null);
});
