// server/controllers/webrtcController.js
const { v4: uuidv4 } = require('uuid');
const { firestore } = require('../firebase-admin');

// Initialize WebRTC session
exports.initializeSession = async (req, res) => {
  try {
    const { readerId, clientId, sessionType } = req.body;
    
    if (!readerId || !clientId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Generate a unique session ID
    const sessionId = uuidv4();
    
    // Create session record in database
    const session = await req.prisma.session.create({
      data: {
        id: sessionId,
        readerId,
        clientId,
        status: 'INITIALIZED',
        type: sessionType || 'VIDEO',
        createdAt: new Date()
      }
    });
    
    // Create session record in Firestore
    await firestore.collection('videoSessions').doc(sessionId).set({
      readerId,
      clientId,
      sessionType: sessionType || 'VIDEO',
      status: 'initialized',
      createdAt: new Date(),
      signaling: {
        offers: [],
        answers: [],
        iceCandidates: []
      }
    });
    
    res.status(201).json({
      success: true,
      sessionId,
      message: 'WebRTC session initialized'
    });
  } catch (error) {
    console.error('Error initializing WebRTC session:', error);
    res.status(500).json({ error: 'Failed to initialize WebRTC session' });
  }
};

// Get session details
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session from database
    const session = await req.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        reader: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            ratePerMinute: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            balance: true
          }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get session from Firestore for real-time data
    const firestoreSession = await firestore.collection('videoSessions').doc(sessionId).get();
    
    let firestoreData = {};
    if (firestoreSession.exists) {
      firestoreData = firestoreSession.data();
    }
    
    res.status(200).json({
      success: true,
      session: {
        ...session,
        firestoreData
      }
    });
  } catch (error) {
    console.error('Error getting session details:', error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
};

// Start WebRTC session
exports.startSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, userRole } = req.body;
    
    if (!userId || !userRole) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get session from database
    const session = await req.prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user is part of this session
    if (
      (userRole === 'reader' && session.readerId !== userId) ||
      (userRole === 'client' && session.clientId !== userId)
    ) {
      return res.status(403).json({ error: 'User not authorized for this session' });
    }
    
    // Update session status
    await req.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'CONNECTING',
        updatedAt: new Date()
      }
    });
    
    // Update Firestore session
    await firestore.collection('videoSessions').doc(sessionId).update({
      status: 'connecting',
      [`${userRole}Ready`]: true,
      updatedAt: new Date()
    });
    
    // Notify through socket that user is ready
    req.io.to(sessionId).emit('user-ready', { userId, userRole, sessionId });
    
    res.status(200).json({
      success: true,
      message: `${userRole} ready to connect`
    });
  } catch (error) {
    console.error('Error starting WebRTC session:', error);
    res.status(500).json({ error: 'Failed to start WebRTC session' });
  }
};

// End WebRTC session
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, userRole, reason, totalMinutes, totalAmount } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get session from database
    const session = await req.prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify user is part of this session
    if (
      (userRole === 'reader' && session.readerId !== userId) ||
      (userRole === 'client' && session.clientId !== userId)
    ) {
      return res.status(403).json({ error: 'User not authorized for this session' });
    }
    
    // Update session status
    await req.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        duration: totalMinutes || null,
        totalAmount: totalAmount ? totalAmount.toString() : null,
        endReason: reason || 'user_ended',
        updatedAt: new Date()
      }
    });
    
    // Update Firestore session
    await firestore.collection('videoSessions').doc(sessionId).update({
      status: 'ended',
      endedAt: new Date(),
      totalMinutes: totalMinutes || null,
      amountCharged: totalAmount || null,
      endReason: reason || 'user_ended'
    });
    
    // Notify through socket that session has ended
    req.io.to(sessionId).emit('session-ended', { 
      sessionId, 
      endedBy: userId, 
      reason: reason || 'user_ended',
      totalMinutes,
      totalAmount
    });
    
    res.status(200).json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('Error ending WebRTC session:', error);
    res.status(500).json({ error: 'Failed to end WebRTC session' });
  }
};

// Store ICE candidate
exports.storeIceCandidate = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { candidate, userId, target } = req.body;
    
    if (!candidate || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Store ICE candidate in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      'signaling.iceCandidates': firestore.FieldValue.arrayUnion({
        from: userId,
        target,
        candidate,
        timestamp: new Date()
      })
    });
    
    // Forward ICE candidate through socket
    req.io.to(sessionId).emit('ice-candidate', { 
      candidate, 
      from: userId, 
      target 
    });
    
    res.status(200).json({
      success: true,
      message: 'ICE candidate stored and forwarded'
    });
  } catch (error) {
    console.error('Error storing ICE candidate:', error);
    res.status(500).json({ error: 'Failed to store ICE candidate' });
  }
};

// Store SDP offer
exports.storeOffer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { offer, userId, target } = req.body;
    
    if (!offer || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Store offer in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      'signaling.offers': firestore.FieldValue.arrayUnion({
        from: userId,
        target,
        offer,
        timestamp: new Date()
      })
    });
    
    // Forward offer through socket
    req.io.to(sessionId).emit('offer', { 
      offer, 
      from: userId, 
      target 
    });
    
    res.status(200).json({
      success: true,
      message: 'Offer stored and forwarded'
    });
  } catch (error) {
    console.error('Error storing offer:', error);
    res.status(500).json({ error: 'Failed to store offer' });
  }
};

// Store SDP answer
exports.storeAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer, userId, target } = req.body;
    
    if (!answer || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Store answer in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      'signaling.answers': firestore.FieldValue.arrayUnion({
        from: userId,
        target,
        answer,
        timestamp: new Date()
      })
    });
    
    // Forward answer through socket
    req.io.to(sessionId).emit('answer', { 
      answer, 
      from: userId, 
      target 
    });
    
    res.status(200).json({
      success: true,
      message: 'Answer stored and forwarded'
    });
  } catch (error) {
    console.error('Error storing answer:', error);
    res.status(500).json({ error: 'Failed to store answer' });
  }
};