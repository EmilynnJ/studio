import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';
import { io as ClientIO } from 'socket.io-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Authenticate user session
  const serverSession = await getServerSession(req, res, authOptions);
  if (!serverSession?.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Get reader info from database
  const reader = await prisma.user.findUnique({
    where: { email: serverSession.user.email },
    select: { id: true, role: true }
  });

  if (!reader || reader.role !== 'READER') {
    return res.status(403).json({ message: 'Forbidden: Only readers can accept sessions' });
  }

  const { sessionId } = req.query;
  if (typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'Invalid session ID' });
  }

  // Fetch session and validate ownership and status
  const existingSession = await prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (!existingSession) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (existingSession.readerId !== reader.id) {
    return res.status(403).json({ message: 'Forbidden: You are not assigned to this session' });
  }
  if (existingSession.status !== 'REQUESTED') {
    return res.status(400).json({ message: 'Session cannot be accepted in its current state' });
  }

  // Update session to active (STARTED) and set startTime
  const updatedSession = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'STARTED',
      startTime: new Date()
    }
  });

  // Notify client via Socket.IO
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL;
    if (!socketServerUrl) {
      throw new Error('Socket server URL not configured');
    }

    const socket = ClientIO(socketServerUrl, { transports: ['websocket'] });
    socket.emit('session-accepted', {
      roomId: sessionId,
      acceptDetails: { startTime: updatedSession.startTime }
    });
    socket.disconnect();
  } catch (error: any) {
    console.error('Socket notification failed:', error.message);
  }

  return res.status(200).json(updatedSession);
}