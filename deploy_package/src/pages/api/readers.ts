import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { UserRole } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const readers = await prisma.user.findMany({
      where: { role: UserRole.READER },
    });
    return res.status(200).json(readers);
  } catch (error) {
    console.error('Failed to fetch readers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}