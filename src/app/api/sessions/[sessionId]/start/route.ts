import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const startTime = body.startTime ? new Date(body.startTime) : new Date();

    const sessionDocRef = doc(db, 'videoSessions', sessionId);

    await updateDoc(sessionDocRef, {
      status: 'active',
      startedAt: serverTimestamp(),
    });

    return NextResponse.json({ message: 'Session started successfully', startedAt: startTime.toISOString() });

  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
