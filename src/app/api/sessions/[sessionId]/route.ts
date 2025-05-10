import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase'; // Adjust path as necessary

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const sessionDocRef = doc(db, 'videoSessions', sessionId); // Assuming 'videoSessions' is your collection
    const sessionDocSnap = await getDoc(sessionDocRef);

    if (!sessionDocSnap.exists()) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionData = sessionDocSnap.data();
    
    // Potentially fetch related reader/client data if not embedded
    // For example:
    // const readerDoc = await getDoc(doc(db, 'users', sessionData.readerUid));
    // const clientDoc = await getDoc(doc(db, 'users', sessionData.clientUid));
    // const populatedSessionData = {
    //   ...sessionData,
    //   reader: readerDoc.data(),
    //   client: clientDoc.data(),
    // };

    // For now, returning raw session data
    return NextResponse.json({ ...sessionData, id: sessionDocSnap.id });

  } catch (error) {
    console.error('Error fetching session data:', error);
    return NextResponse.json({ error: 'Failed to fetch session data' }, { status: 500 });
  }
}
