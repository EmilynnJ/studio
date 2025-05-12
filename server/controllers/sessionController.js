// server/controllers/sessionController.js
const { admin, firestore } = require('../firebase-admin');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

// Create a new session request
exports.createSession = async (req, res) => {
  try {
    const { 
      clientId, 
      readerId, 
      sessionType, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!clientId || !readerId || !sessionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get client and reader details
    const [clientDoc, readerDoc] = await Promise.all([
      firestore.collection('users').doc(clientId).get(),
      firestore.collection('users').doc(readerId).get()
    ]);
    
    if (!clientDoc.exists || !readerDoc.exists) {
      return res.status(404).json({ error: 'Client or reader not found' });
    }
    
    const clientData = clientDoc.data();
    const readerData = readerDoc.data();
    
    // Check if client has sufficient balance
    if ((clientData.balance || 0) < (readerData.ratePerMinute || 0)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Check if reader is online
    if (readerData.status !== 'online') {
      return res.status(400).json({ error: 'Reader is not available' });
    }
    
    // Create session in Firestore
    const sessionId = firestore.collection('videoSessions').doc().id;
    
    const sessionData = {
      sessionId,
      clientUid: clientId,
      clientName: clientData.name,
      clientPhotoURL: clientData.photoURL,
      readerUid: readerId,
      readerName: readerData.name,
      readerPhotoURL: readerData.photoURL,
      status: 'pending',
      sessionType,
      notes: notes || '',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      readerRatePerMinute: readerData.ratePerMinute || 5,
    };
    
    await firestore.collection('videoSessions').doc(sessionId).set(sessionData);
    
    // Create session in Prisma
    await prisma.session.create({
      data: {
        id: sessionId,
        status: 'REQUESTED',
        clientId,
        readerId,
        notes: notes || null,
      },
    });
    
    // Send notification to reader (implementation depends on your notification system)
    // This could be a push notification, email, or in-app notification
    
    res.status(201).json({ 
      sessionId,
      message: 'Session request created successfully' 
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
};

// Accept a session request
exports.acceptSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { readerId } = req.body;
    
    // Validate required fields
    if (!sessionId || !readerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get session details
    const sessionDoc = await firestore.collection('videoSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionData = sessionDoc.data();
    
    // Verify reader is the one assigned to this session
    if (sessionData.readerUid !== readerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if session is in pending status
    if (sessionData.status !== 'pending') {
      return res.status(400).json({ error: 'Session is not in pending status' });
    }
    
    // Update session status in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      status: 'accepted_by_reader',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Update session status in Prisma
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ACCEPTED' },
    });
    
    // Send notification to client
    
    res.status(200).json({ 
      message: 'Session accepted successfully' 
    });
  } catch (error) {
    console.error('Error accepting session:', error);
    res.status(500).json({ error: error.message || 'Failed to accept session' });
  }
};

// Start a session
exports.startSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session details
    const sessionDoc = await firestore.collection('videoSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionData = sessionDoc.data();
    
    // Check if session is in accepted status
    if (sessionData.status !== 'accepted_by_reader') {
      return res.status(400).json({ error: 'Session is not in accepted status' });
    }
    
    // Update session status in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      status: 'active',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Update session status in Prisma
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: 'STARTED',
        startTime: new Date(),
      },
    });
    
    res.status(200).json({ 
      message: 'Session started successfully',
      startTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message || 'Failed to start session' });
  }
};

// End a session
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { totalMinutes, totalAmount, reason } = req.body;
    
    // Validate required fields
    if (!sessionId || totalMinutes === undefined || totalAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get session details
    const sessionDoc = await firestore.collection('videoSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionData = sessionDoc.data();
    
    // Check if session is in active status
    if (sessionData.status !== 'active') {
      return res.status(400).json({ error: 'Session is not in active status' });
    }
    
    // Determine the end status based on reason
    let endStatus = 'ended';
    if (reason === 'insufficient_funds') {
      endStatus = 'ended_insufficient_funds';
    } else if (reason === 'cancelled') {
      endStatus = 'cancelled';
    }
    
    // Update session status in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      status: endStatus,
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalMinutes,
      amountCharged: totalAmount,
    });
    
    // Update session status in Prisma
    await prisma.session.update({
      where: { id: sessionId },
      data: { 
        status: endStatus === 'ended' ? 'COMPLETED' : 
                endStatus === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
        endTime: new Date(),
        duration: totalMinutes,
        totalAmount: totalAmount.toString(),
      },
    });
    
    // Process payment to reader (70% of total amount)
    if (totalAmount > 0 && endStatus === 'ended') {
      const readerAmount = Math.round(totalAmount * 0.7 * 100); // Convert to cents
      
      // Transfer funds to reader's connected account
      if (sessionData.readerUid && sessionData.clientUid) {
        // Get reader's Stripe account ID
        const readerDoc = await firestore.collection('users').doc(sessionData.readerUid).get();
        const readerData = readerDoc.data();
        
        if (readerData.stripeAccountId) {
          await stripe.transfers.create({
            amount: readerAmount,
            currency: 'usd',
            destination: readerData.stripeAccountId,
            description: `Payment for session ${sessionId}`,
            metadata: {
              sessionId,
              readerId: sessionData.readerUid,
              clientId: sessionData.clientUid,
            },
          });
        }
      }
    }
    
    res.status(200).json({ 
      message: 'Session ended successfully',
      endTime: new Date().toISOString(),
      status: endStatus,
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: error.message || 'Failed to end session' });
  }
};

// Get session details
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session details from Firestore
    const sessionDoc = await firestore.collection('videoSessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionData = sessionDoc.data();
    
    res.status(200).json(sessionData);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: error.message || 'Failed to get session' });
  }
};

// Submit feedback for a session
exports.submitFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, comment, fromUserId, toUserId } = req.body;
    
    // Validate required fields
    if (!sessionId || !rating || !fromUserId || !toUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create feedback in Firestore
    const feedbackId = firestore.collection('feedback').doc().id;
    
    await firestore.collection('feedback').doc(feedbackId).set({
      sessionId,
      rating,
      comment: comment || '',
      fromUserId,
      toUserId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create feedback in Prisma
    await prisma.feedback.create({
      data: {
        id: feedbackId,
        rating,
        comment: comment || null,
        sessionId,
        fromUserId,
        toUserId,
      },
    });
    
    // Update session to mark feedback as submitted
    const sessionDoc = await firestore.collection('videoSessions').doc(sessionId).get();
    
    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data();
      const isClient = fromUserId === sessionData.clientUid;
      
      await firestore.collection('videoSessions').doc(sessionId).update({
        [`${isClient ? 'client' : 'reader'}FeedbackSubmitted`]: true,
      });
    }
    
    res.status(201).json({ 
      feedbackId,
      message: 'Feedback submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
};