import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { SessionStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { sessionId } = req.query;
  if (!sessionId || Array.isArray(sessionId)) {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  try {
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.STARTED,
        startTime: new Date(),
      },
    });

    return res.status(200).json({ session: updatedSession });
  } catch (error: any) {
    console.error('Failed to start session:', error);
    return res.status(500).json({ error: 'Failed to start session', details: error.message });
  }
}
