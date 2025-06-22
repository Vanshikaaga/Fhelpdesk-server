const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');
const User = require('../models/user.model');

const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers['x-access-token'] || req.headers['authorization'];
    
    if (!token) {
      return res.status(403).json({ 
        success: false,
        message: 'No token provided' 
      });
    }
    
    // Remove Bearer from token string if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }
    
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    req.userId = decoded.id;
    
    // Check if user still exists in database
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token'
    });
  }
};

module.exports = {
  verifyToken
}; 