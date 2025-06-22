const express = require('express');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors 
} = require('../middlewares/validations');

const router = express.Router();

// Register a new user
router.post(
  '/register', 
  validateRegistration,
  handleValidationErrors,
  authController.register
);

// Login user
router.post(
  '/login', 
  validateLogin,
  handleValidationErrors,
  authController.login
);

// Get current user profile
router.get(
  '/profile', 
  verifyToken, 
  authController.getCurrentUser
);

module.exports = router; 