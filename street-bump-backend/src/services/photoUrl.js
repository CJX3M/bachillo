// Bumps reported before the permanent-URL change stored 24h signed URLs. The
// objects were uploaded as public, so dropping the signature gives a URL that
// keeps working. Anything else is returned untouched.
function permanentPhotoUrl(url, bucketName) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'storage.googleapis.com' && parsed.pathname.startsWith(`/${bucketName}/`)) {
            return `${parsed.origin}${parsed.pathname}`;
        }
    } catch {
        // Not a URL: leave it as it is.
    }
    return url;
}

module.exports = { permanentPhotoUrl };
