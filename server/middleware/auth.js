// server/middleware/auth.js
const { admin, auth } = require('../firebase-admin');

// Middleware to authenticate user with Firebase
exports.authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to authorize admin users
exports.authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  
  next();
};

// Middleware to authorize reader users
exports.authorizeReader = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
  }
  
  if (req.user.role !== 'reader' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Reader access required' });
  }
  
  next();
};

// Middleware to authorize client users
exports.authorizeClient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
  }
  
  if (req.user.role !== 'client' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Client access required' });
  }
  
  next();
};