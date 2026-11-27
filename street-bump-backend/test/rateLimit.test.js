const test = require('node:test');
const assert = require('node:assert');
const { fakeRes } = require('./fakeDb');
const { createRateLimit } = require('../src/middleware/rateLimit');

function setup() {
    let time = 0;
    const limit = createRateLimit({ limit: 2, windowMs: 1000, now: () => time });
    const hit = (forwarded) => {
        const res = fakeRes();
        let passed = false;
        limit({ headers: { 'x-forwarded-for': forwarded }, ip: '10.0.0.1' }, res, () => { passed = true; });
        return passed ? 200 : res.statusCode;
    };
    return { hit, advance: (ms) => { time += ms; } };
}

test('blocks after the limit and recovers after the window', () => {
    const { hit, advance } = setup();
    assert.deepStrictEqual([hit('1.1.1.1'), hit('1.1.1.1'), hit('1.1.1.1')], [200, 200, 429]);
    advance(1001);
    assert.strictEqual(hit('1.1.1.1'), 200);
});

test('a forged first X-Forwarded-For entry does not buy more requests', () => {
    const { hit } = setup();
    assert.deepStrictEqual(
        [hit('falso-1, 9.9.9.9'), hit('falso-2, 9.9.9.9'), hit('falso-3, 9.9.9.9')],
        [200, 200, 429]);
});

test('different clients do not share a quota', () => {
    const { hit } = setup();
    hit('x, 9.9.9.9');
    hit('x, 9.9.9.9');
    assert.strictEqual(hit('x, 8.8.8.8'), 200);
});
