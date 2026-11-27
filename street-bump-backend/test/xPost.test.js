const test = require('node:test');
const assert = require('node:assert');
const { fakeDb, fakeRes } = require('./fakeDb');
const { normalizeHandle, buildXPost } = require('../src/services/xPost');
const { createXPostHandler } = require('../src/controllers/reportController');

const NOW = new Date('2026-11-28T15:00:00.000Z');
const BASE = 'https://ejemplo.test';
const post = (extra) => buildXPost({ count: 3, day: '2026-11-27', baseUrl: BASE, handle: 'Gobierno', ...extra });

test('normalizeHandle accepts a user with or without @ and rejects the rest', () => {
    assert.strictEqual(normalizeHandle(' @Gobierno_1 '), 'Gobierno_1');
    assert.strictEqual(normalizeHandle('Gobierno'), 'Gobierno');
    for (const bad of [undefined, '', '@', 'dos palabras', 'https://x.com/gob', 'a'.repeat(16)]) {
        assert.strictEqual(normalizeHandle(bad), null);
    }
});

test('post has the count, the dated link and the mention', () => {
    assert.strictEqual(post(),
        '3 baches nuevos reportados ayer en Hermosillo.\nhttps://ejemplo.test/bachesNuevos?d=2026-11-27 @Gobierno');
});

test('post uses the singular, drops a missing mention and a trailing slash', () => {
    assert.strictEqual(post({ count: 1, handle: undefined, baseUrl: `${BASE}/` }),
        '1 bache nuevo reportado ayer en Hermosillo.\nhttps://ejemplo.test/bachesNuevos?d=2026-11-27');
});

test('there is no post without bumps', () => {
    assert.strictEqual(post({ count: 0 }), null);
});

async function call(db, handle) {
    const res = fakeRes();
    await createXPostHandler({ db, now: () => NOW, baseUrl: BASE, handle })({}, res);
    return res;
}

const bump = (extra) => ({ verified: true, fixed: false, verifiedAt: '2026-11-27T18:00:00.000Z', ...extra });

test('handler counts the same bumps as the page', async () => {
    const res = await call(fakeDb({ a: bump(), fixed: bump({ fixed: true }), old: bump({ verifiedAt: '2026-11-26T18:00:00.000Z' }) }), '@Gobierno');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, {
        day: '2026-11-27', count: 1, hasMention: true,
        text: '1 bache nuevo reportado ayer en Hermosillo.\nhttps://ejemplo.test/bachesNuevos?d=2026-11-27 @Gobierno',
    });
});

test('handler answers no text and no mention for an empty day without handle', async () => {
    const res = await call(fakeDb({}), undefined);
    assert.deepStrictEqual(res.body, { day: '2026-11-27', count: 0, text: null, hasMention: false });
});

test('handler answers 500 when the database fails', async () => {
    const res = await call({ collection: () => { throw new Error('down'); } }, 'Gobierno');
    assert.strictEqual(res.statusCode, 500);
});
