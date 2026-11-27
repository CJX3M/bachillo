const test = require('node:test');
const assert = require('node:assert');
const { selectNearby } = require('../src/services/nearby');

const at = (id, lat, extra) => ({ id, location: { lat, lng: -110.95 }, verified: true, fixed: false, ...extra });

test('keeps only approved, unfixed bumps inside the radius, nearest first', () => {
    const bumps = [
        at('far', 29.5),
        at('second', 29.09),
        at('fixed', 29.07, { fixed: true }),
        at('pending', 29.07, { verified: false }),
        at('first', 29.073),
        at('legacy', 29.1, { fixed: undefined }),
    ];
    const result = selectNearby(bumps, { lat: 29.072, lng: -110.95 }, 5);
    assert.deepStrictEqual(result.map((b) => b.id), ['first', 'second', 'legacy']);
    assert.ok(result[0].distance < result[1].distance);
});
