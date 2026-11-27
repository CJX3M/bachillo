// X user names: letters, digits and underscore, 15 at most.
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

// The user name without "@", or null if what was configured is not one.
function normalizeHandle(raw) {
    const handle = (raw || '').trim().replace(/^@/, '');
    return HANDLE.test(handle) ? handle : null;
}

// The daily post, or null when there is nothing to report.
function buildXPost({ count, day, baseUrl, handle }) {
    if (!count) return null;
    const what = count === 1 ? 'bache nuevo reportado' : 'baches nuevos reportados';
    // The day in the link keeps X from reusing an earlier link preview.
    const link = `${baseUrl.replace(/\/+$/, '')}/bachesNuevos?d=${day}`;
    const user = normalizeHandle(handle);
    return `${count} ${what} ayer en Hermosillo.\n${link}${user ? ` @${user}` : ''}`;
}

module.exports = { normalizeHandle, buildXPost };
