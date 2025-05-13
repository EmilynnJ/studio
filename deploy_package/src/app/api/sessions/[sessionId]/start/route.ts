import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { firestore } from '@/lib/firebase/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId } = params;
    const body = await request.json();
    const { userId, userRole } = body;
    
    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get session from database
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!dbSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Verify user is part of this session
    if (
      (userRole === 'reader' && dbSession.readerId !== userId) ||
      (userRole === 'client' && dbSession.clientId !== userId)
    ) {
      return NextResponse.json({ error: 'User not authorized for this session' }, { status: 403 });
    }
    
    // Update session status
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'CONNECTING',
        updatedAt: new Date()
      }
    });
    
    // Update Firestore session
    const firestoreSessionRef = firestore.collection('videoSessions').doc(sessionId);
    await firestoreSessionRef.update({
      status: 'connecting',
      [`${userRole}Ready`]: true,
      updatedAt: new Date()
    });
    
    // Check if both users are ready
    const firestoreSession = await firestoreSessionRef.get();
    const firestoreData = firestoreSession.data() || {};
    
    if (firestoreData.readerReady && firestoreData.clientReady) {
      // Both users are ready, update status to active
      await firestoreSessionRef.update({
        status: 'active',
        updatedAt: new Date()
      });
      
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'STARTED',
          startTime: new Date()
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `${userRole} ready to connect`,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}