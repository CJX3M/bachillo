const { auth } = require('firebase-admin');

const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader); // Debug log

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No bearer token found');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Verifying token...'); // Debug log

    const decodedToken = await auth().verifyIdToken(token);
    console.log('Decoded token:', decodedToken); // Debug log

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(403).json({ error: 'Unauthorized access' });
  }
};

module.exports = { verifyAdminToken };