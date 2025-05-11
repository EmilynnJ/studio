import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        reader: true,
        client: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const ratePerMinute = session.reader.hourlyRate;
    const initialBalance = session.totalAmount ?? 0;

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        notes: session.notes,
        recordingUrl: session.recordingUrl,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      reader: {
        id: session.reader.id,
        name: session.reader.name,
        email: session.reader.email,
        bio: session.reader.bio,
        specialties: session.reader.specialties,
        hourlyRate: session.reader.hourlyRate,
        stripeAccountId: session.reader.stripeAccountId,
      },
      client: {
        id: session.client.id,
        name: session.client.name,
        email: session.client.email,
        bio: session.client.bio,
        specialties: session.client.specialties,
        hourlyRate: session.client.hourlyRate,
        stripeAccountId: session.client.stripeAccountId,
      },
      ratePerMinute,
      initialBalance,
    });
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
