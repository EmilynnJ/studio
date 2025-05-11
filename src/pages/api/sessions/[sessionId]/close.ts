import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { sessionId } = req.query;
  if (!sessionId || Array.isArray(sessionId)) {
    return res.status(400).json({ error: 'Invalid sessionId' });
  }

  const { endTime, totalMinutes, amountCharged } = req.body;
  if (!endTime || typeof totalMinutes !== 'number' || typeof amountCharged !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid parameters. Required: endTime (ISO string), totalMinutes (number), amountCharged (number).' });
  }

  let parsedEndTime: Date;
  try {
    parsedEndTime = new Date(endTime);
    if (isNaN(parsedEndTime.getTime())) {
      throw new Error('Invalid date');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid endTime format. It must be a valid ISO date string.' });
  }

  // Determine status based on billing result
  const status = amountCharged > 0 ? 'ended' : 'ended_insufficient_funds';

  try {
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        endTime: parsedEndTime,
        duration: totalMinutes,
        totalAmount: amountCharged,
        status,
      },
    });

    return res.status(200).json({ session: updatedSession });
  } catch (error: any) {
    console.error('Failed to close session:', error);
    return res.status(500).json({ error: 'Failed to close session', details: error.message });
  }
}
