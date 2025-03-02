const { admin } = require('../config/firebase');

const verifyAdminToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (decodedToken.email !== adminEmail) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { verifyAdminToken };