/**
 * Admin AI Usage API
 *
 * GET /api/admin/ai-usage — Returns AI usage stats for the admin dashboard.
 * Supports date range filtering via ?from=&to= query params.
 *
 * @module api/admin/ai-usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse date range
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

    const whereClause = dateFilter.gte || dateFilter.lte
      ? { createdAt: dateFilter }
      : {};

    // Aggregate stats
    const [totals, logs, creatorStats] = await Promise.all([
      prisma.aiChatLog.aggregate({
        where: whereClause,
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          costUsd: true,
        },
        _count: true,
        _avg: {
          latencyMs: true,
          totalTokens: true,
        },
      }),
      prisma.aiChatLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          creator: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.aiChatLog.groupBy({
        by: ['creatorId'],
        where: whereClause,
        _sum: {
          totalTokens: true,
          costUsd: true,
        },
        _count: true,
        orderBy: { _count: { creatorId: 'desc' } },
        take: 20,
      }),
    ]);

    // Fetch creator names for the grouped stats
    const creatorIds = creatorStats.map((s) => s.creatorId);
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true, email: true },
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    const topCreators = creatorStats.map((s) => ({
      creatorId: s.creatorId,
      name: creatorMap.get(s.creatorId)?.name || 'Unknown',
      email: creatorMap.get(s.creatorId)?.email || '',
      messageCount: s._count,
      totalTokens: s._sum.totalTokens || 0,
      totalCost: s._sum.costUsd || 0,
    }));

    return NextResponse.json({
      summary: {
        totalMessages: totals._count,
        totalInputTokens: totals._sum.inputTokens || 0,
        totalOutputTokens: totals._sum.outputTokens || 0,
        totalTokens: totals._sum.totalTokens || 0,
        totalCostUsd: totals._sum.costUsd || 0,
        avgLatencyMs: Math.round(totals._avg.latencyMs || 0),
        avgTokensPerMessage: Math.round(totals._avg.totalTokens || 0),
      },
      topCreators,
      recentLogs: logs.map((log) => ({
        id: log.id,
        creatorName: log.creator.name,
        creatorEmail: log.creator.email,
        model: log.model,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        totalTokens: log.totalTokens,
        costUsd: log.costUsd,
        latencyMs: log.latencyMs,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Admin AI Usage] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI usage' }, { status: 500 });
  }
}
