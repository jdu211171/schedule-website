import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withBranchAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const batchCancelSchema = z.object({
  classIds: z.array(z.string()).optional(),
  seriesId: z.string().optional(),
  fromDate: z.string().optional(), // YYYY-MM-DD, used with seriesId
  reason: z.enum(['SICK', 'PERMANENTLY_LEFT', 'ADMIN_CANCELLED']).optional(),
});

export const POST = withBranchAccess(['ADMIN', 'STAFF'], async (req: NextRequest, session, branchId) => {
  try {
    const body = await req.json();
    const parsed = batchCancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '無効な入力' }, { status: 400 });
    }
    const { classIds, seriesId, fromDate, reason } = parsed.data;

    const now = new Date();
    const userId = session.user?.id ?? null;

    // Determine target class IDs
    let targetIds: string[] = [];
    if (classIds && classIds.length > 0) {
      targetIds = classIds;
    } else if (seriesId) {
      const dateFilter = fromDate
        ? new Date(Date.UTC(
            Number(fromDate.slice(0, 4)),
            Number(fromDate.slice(5, 7)) - 1,
            Number(fromDate.slice(8, 10)),
            0, 0, 0, 0
          ))
        : undefined;

      const sessions = await prisma.classSession.findMany({
        where: {
          seriesId,
          ...(dateFilter ? { date: { gte: dateFilter } } : {}),
          // Branch restriction for non-admins
          ...(session.user?.role === 'ADMIN' ? {} : { branchId }),
        },
        select: { classId: true },
      });
      targetIds = sessions.map((s) => s.classId);
    } else {
      return NextResponse.json({ error: 'classIds または seriesId が必要です' }, { status: 400 });
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ data: [], message: '対象の授業がありません', updatedCount: 0, pagination: { total: 0, page: 1, limit: 0, pages: 0 } });
    }

    const result = await prisma.classSession.updateMany({
      where: {
        classId: { in: targetIds },
        // Do not touch already cancelled sessions to avoid bumping timestamps needlessly
        isCancelled: false,
      },
      data: {
        isCancelled: true,
        cancellationReason: reason ?? 'ADMIN_CANCELLED',
        cancelledAt: now,
        cancelledByUserId: userId,
      },
    });

    return NextResponse.json({
      data: [],
      message: `${result.count}件の授業をキャンセルしました`,
      updatedCount: result.count,
      pagination: { total: result.count, page: 1, limit: result.count, pages: 1 },
    });
  } catch (error) {
    console.error('Error batch cancelling class sessions:', error);
    return NextResponse.json({ error: '授業のキャンセルに失敗しました' }, { status: 500 });
  }
});

