import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { firestore } from '@/lib/firebase/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId } = params;
    
    // Get session from database
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        reader: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            ratePerMinute: true,
            stripeAccountId: true
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
    
    if (!dbSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Get real-time session data from Firestore
    const firestoreSessionRef = firestore.collection('videoSessions').doc(sessionId);
    const firestoreSession = await firestoreSessionRef.get();
    
    let firestoreData = {};
    if (firestoreSession.exists) {
      firestoreData = firestoreSession.data() || {};
    }
    
    return NextResponse.json({
      success: true,
      session: {
        ...dbSession,
        firestoreData
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    
    // Update session in database
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });
    
    // Update session in Firestore
    const firestoreSessionRef = firestore.collection('videoSessions').doc(sessionId);
    await firestoreSessionRef.update({
      ...body,
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}