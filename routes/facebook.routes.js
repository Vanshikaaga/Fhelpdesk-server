const express = require('express');
const facebookController = require('../controllers/facebook.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Facebook webhook verification - must be accessible without auth
router.get('/webhook', facebookController.verifyWebhook);

// Facebook webhook event handling - must be accessible without auth
router.post('/webhook', facebookController.handleWebhook);

// Exchange Facebook token
router.post('/exchange-token', verifyToken, facebookController.exchangeToken);

// Connect a Facebook page
router.post('/connect-page', verifyToken, facebookController.connectPage);

// Get all connected pages for a user
router.get('/pages', verifyToken, facebookController.getConnectedPages);

// Disconnect a Facebook page
router.delete('/disconnect-page/:pageId', verifyToken, facebookController.disconnectPage);

module.exports = router; 