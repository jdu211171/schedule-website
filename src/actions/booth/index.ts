"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

/**
 * 指定した曜日・時間帯に空いているブースを取得する
 *
 * @param weekday   曜日 (RegularClassTemplate.dayOfWeek と一致する値)
 * @param startTime "HH:mm" 形式の開始時刻
 * @param endTime   "HH:mm" 形式の終了時刻
 * @param page      ページ番号 (1 origin)
 * @param pageSize  1 ページあたりの件数
 */
interface GetBoothsParams {
  weekday?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

function timeStringToDate(time?: string): Date | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(":").map(Number);
  const d = new Date(0);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

export async function getBooths({
  weekday,
  startTime,
  endTime,
  page = 1,
  pageSize = 10,
}: GetBoothsParams = {}) {
  await requireAuth();

  const skip = (page - 1) * pageSize;
  const startTimeDate = timeStringToDate(startTime);
  const endTimeDate = timeStringToDate(endTime);

  // Build dynamic where clause
  const where: {
    status: boolean;
    regularClassTemplates?: {
      none: {
        dayOfWeek: string;
        AND: { startTime: { lt: Date }; endTime: { gt: Date } }[];
      };
    };
  } = { status: true };

  if (weekday && startTimeDate && endTimeDate) {
    where.regularClassTemplates = {
      none: {
        dayOfWeek: weekday,
        AND: [
          { startTime: { lt: endTimeDate }, endTime: { gt: startTimeDate } },
          { startTime: { lt: endTimeDate }, endTime: { gt: startTimeDate } },
        ],
      },
    };
  }

  return prisma.booth.findMany({
    skip,
    take: pageSize,
    orderBy: {
      createdAt: "desc",
    },
  });
}
