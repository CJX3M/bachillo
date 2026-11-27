const test = require('node:test');
const assert = require('node:assert');
const { parseAdminEmails, makeVerifyAdminToken } = require('../src/middleware/auth');

async function run({ header = 'Bearer t', decoded, throws, emails = ['admin@example.com'] }) {
    const verify = makeVerifyAdminToken({
        verifyIdToken: async () => {
            if (throws) throw new Error('bad token');
            return decoded;
        },
        getAdminEmails: () => emails,
    });
    const req = { headers: header ? { authorization: header } : {} };
    const out = { status: null, nextCalled: false, req };
    const res = {
        status(code) { out.status = code; return this; },
        json() { return this; },
    };
    await verify(req, res, () => { out.nextCalled = true; });
    return out;
}

const admin = { email: 'admin@example.com', email_verified: true };

test('401 without bearer header', async () => {
    assert.strictEqual((await run({ header: null, decoded: admin })).status, 401);
});

test('403 when token verification throws', async () => {
    assert.strictEqual((await run({ throws: true })).status, 403);
});

test('403 for an account that is not in the list', async () => {
    const out = await run({ decoded: { email: 'otro@example.com', email_verified: true } });
    assert.strictEqual(out.status, 403);
    assert.strictEqual(out.nextCalled, false);
});

test('403 when the admin email is not verified', async () => {
    const out = await run({ decoded: { email: 'admin@example.com', email_verified: false } });
    assert.strictEqual(out.status, 403);
    assert.strictEqual(out.nextCalled, false);
});

test('admin passes, ignoring email case', async () => {
    const decoded = { email: 'Admin@Example.com', email_verified: true };
    const out = await run({ decoded });
    assert.strictEqual(out.nextCalled, true);
    assert.strictEqual(out.req.user, decoded);
});

test('empty admin list denies everyone', async () => {
    assert.strictEqual((await run({ decoded: admin, emails: [] })).status, 403);
});

test('parseAdminEmails normalizes the list', () => {
    assert.deepStrictEqual(parseAdminEmails(' A@x.com, ,b@x.com '), ['a@x.com', 'b@x.com']);
    assert.deepStrictEqual(parseAdminEmails(undefined), []);
});
