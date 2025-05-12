// server/routes/api.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const sessionController = require('../controllers/sessionController');
const webrtcController = require('../controllers/webrtcController');

const prisma = new PrismaClient();

// Middleware to add prisma to request
router.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Protected routes (require authentication)
router.use('/admin', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// Admin routes
router.post('/admin/create-reader', adminController.createReader);
router.post('/admin/sync-products', adminController.syncProducts);

// Session routes
router.get('/sessions', authMiddleware, sessionController.getSessions);
router.get('/sessions/:id', authMiddleware, sessionController.getSession);
router.post('/sessions', authMiddleware, sessionController.createSession);
router.put('/sessions/:id', authMiddleware, sessionController.updateSession);

// WebRTC routes
router.post('/webrtc/sessions', authMiddleware, webrtcController.initializeSession);
router.get('/webrtc/sessions/:sessionId', authMiddleware, webrtcController.getSession);
router.post('/webrtc/sessions/:sessionId/start', authMiddleware, webrtcController.startSession);
router.post('/webrtc/sessions/:sessionId/end', authMiddleware, webrtcController.endSession);
router.post('/webrtc/sessions/:sessionId/ice-candidate', authMiddleware, webrtcController.storeIceCandidate);
router.post('/webrtc/sessions/:sessionId/offer', authMiddleware, webrtcController.storeOffer);
router.post('/webrtc/sessions/:sessionId/answer', authMiddleware, webrtcController.storeAnswer);

// Reader routes
router.get('/readers', async (req, res) => {
  try {
    const readers = await prisma.user.findMany({
      where: {
        role: 'READER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        specialties: true,
        ratePerMinute: true,
        status: true
      }
    });
    
    res.json(readers);
  } catch (error) {
    console.error('Error fetching readers:', error);
    res.status(500).json({ error: 'Failed to fetch readers' });
  }
});

// Get online readers
router.get('/readers/online', async (req, res) => {
  try {
    const onlineReaders = await prisma.user.findMany({
      where: {
        role: 'READER',
        isActive: true,
        status: 'online'
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        specialties: true,
        ratePerMinute: true,
        status: true
      }
    });
    
    res.json(onlineReaders);
  } catch (error) {
    console.error('Error fetching online readers:', error);
    res.status(500).json({ error: 'Failed to fetch online readers' });
  }
});

// Get reader by ID
router.get('/readers/:id', async (req, res) => {
  try {
    const reader = await prisma.user.findUnique({
      where: {
        id: req.params.id,
        role: 'READER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        specialties: true,
        ratePerMinute: true,
        status: true
      }
    });
    
    if (!reader) {
      return res.status(404).json({ error: 'Reader not found' });
    }
    
    res.json(reader);
  } catch (error) {
    console.error('Error fetching reader:', error);
    res.status(500).json({ error: 'Failed to fetch reader' });
  }
});

module.exports = router;