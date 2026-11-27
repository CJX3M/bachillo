const { auth } = require('firebase-admin');

const parseAdminEmails = (value) =>
  (value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

// A valid Firebase token only proves "someone signed in to this project"; admin
// actions also require the account to be on the allow list.
const makeVerifyAdminToken = ({ verifyIdToken, getAdminEmails }) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await verifyIdToken(authHeader.slice('Bearer '.length));
    const email = decodedToken.email?.toLowerCase();
    if (decodedToken.email_verified !== true || !getAdminEmails().includes(email)) {
      return res.status(403).json({ error: 'Not an admin account' });
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(403).json({ error: 'Unauthorized access' });
  }
};

const verifyAdminToken = makeVerifyAdminToken({
  verifyIdToken: (token) => auth().verifyIdToken(token),
  getAdminEmails: () => parseAdminEmails(process.env.ADMIN_EMAILS),
});

module.exports = { parseAdminEmails, makeVerifyAdminToken, verifyAdminToken };
