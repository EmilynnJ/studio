// server/routes/webrtc.js
const express = require('express');
const router = express.Router();
const webrtcController = require('../controllers/webrtcController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// WebRTC session routes
router.post('/sessions', webrtcController.initializeSession);
router.get('/sessions/:sessionId', webrtcController.getSession);
router.post('/sessions/:sessionId/start', webrtcController.startSession);
router.post('/sessions/:sessionId/end', webrtcController.endSession);

// WebRTC signaling routes
router.post('/sessions/:sessionId/ice-candidate', webrtcController.storeIceCandidate);
router.post('/sessions/:sessionId/offer', webrtcController.storeOffer);
router.post('/sessions/:sessionId/answer', webrtcController.storeAnswer);

module.exports = router;