import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase'; // Adjust path as necessary

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
    const startTime = body.startTime ? new Date(body.startTime) : new Date(); // Use provided or current time

    const sessionDocRef = doc(db, 'videoSessions', sessionId); // Assuming 'videoSessions'
    
    // Check if session exists before updating (optional, depends on flow)
    // const sessionDocSnap = await getDoc(sessionDocRef);
    // if (!sessionDocSnap.exists()) {
    //   return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    // }

    await updateDoc(sessionDocRef, {
      status: 'active', // Or whatever status indicates it's started
      startedAt: serverTimestamp(), // Use server timestamp for accuracy
      // Potentially update other fields as needed
    });

    return NextResponse.json({ message: 'Session started successfully', startedAt: startTime.toISOString() });

  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
