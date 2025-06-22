const { body, validationResult } = require('express-validator');

// Validation middleware for registration
const validateRegistration = [
  body('name')
    .not().isEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  
  body('email')
    .not().isEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email is not valid')
    .normalizeEmail(),
  
  body('password')
    .not().isEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .not().isEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email is not valid')
    .normalizeEmail(),
  
  body('password')
    .not().isEmpty().withMessage('Password is required')
];

// Validation middleware for sending a message
const validateMessage = [
  body('content')
    .not().isEmpty().withMessage('Message content is required')
    .trim()
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateMessage,
  handleValidationErrors
}; 