import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { SessionStatus } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { clientId, readerId } = req.body;

  if (!clientId || !readerId) {
    return res.status(400).json({ error: 'Missing clientId or readerId' });
  }

  try {
    const session = await prisma.session.create({
      data: {
        clientId,
        readerId,
        status: SessionStatus.REQUESTED,
      },
    });

    return res.status(201).json({
      id: session.id,
      clientId: session.clientId,
      readerId: session.readerId,
      status: session.status,
      requestedAt: session.createdAt,
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
