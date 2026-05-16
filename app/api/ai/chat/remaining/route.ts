/**
 * Sitrus AI - Remaining Messages Endpoint
 *
 * GET /api/ai/chat/remaining — Returns how many AI messages the creator has left today.
 *
 * @module api/ai/chat/remaining
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

const MAX_MESSAGES_PER_DAY = 5;

function getStartOfDayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStart = getStartOfDayUTC();
    const usageCount = await prisma.aiChatLog.count({
      where: {
        creatorId: session.user.id,
        createdAt: { gte: todayStart },
      },
    });

    return NextResponse.json({
      remaining: Math.max(0, MAX_MESSAGES_PER_DAY - usageCount),
      limit: MAX_MESSAGES_PER_DAY,
      used: usageCount,
    });
  } catch (error) {
    console.error('[AI Remaining] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch remaining count' }, { status: 500 });
  }
}
