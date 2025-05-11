import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { getToken } from 'next-auth/jwt';
import { SessionStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sessionId } = req.query;
  if (typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  // Authenticate user
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = token.sub as string;

  // Validate request body
  const { rating, comment } = req.body;
  const parsedRating = Number(rating);
  if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    // Fetch session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { clientId: true, readerId: true, status: true }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Ensure user participated in session
    const { clientId, readerId, status } = session;
    if (userId !== clientId && userId !== readerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Ensure session is completed
    if (status !== SessionStatus.COMPLETED) {
      return res.status(400).json({ error: 'Cannot leave feedback before session is completed' });
    }

    // Determine recipient
    const toUserId = userId === clientId ? readerId : clientId;

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        rating: parsedRating,
        comment: comment?.toString() || null,
        session: { connect: { id: sessionId } },
        fromUser: { connect: { id: userId } },
        toUser: { connect: { id: toUserId } }
      }
    });

    return res.status(201).json(feedback);
  } catch (error) {
    console.error('Failed to create feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}