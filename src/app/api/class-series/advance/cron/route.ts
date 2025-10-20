// src/app/api/class-series/advance/cron/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  advanceGenerateForSeries,
  computeAdvanceWindow,
} from "@/lib/series-advance";
import { getEffectiveSchedulingConfig } from "@/lib/scheduling-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds

function isAuthorizedCron(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";
  const isVercelCron = ua.includes("vercel-cron/1.0");
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}` || isVercelCron; // allow Vercel Cron invocations
  }
  return isVercelCron || process.env.NODE_ENV !== "production"; // be permissive in dev
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const leadDaysOverride = url.searchParams.get("leadDays");
  const limit = url.searchParams.get("limit")
    ? Math.max(1, Number(url.searchParams.get("limit")))
    : undefined;
  const branchId = url.searchParams.get("branchId") || undefined;
  const singleSeriesId = url.searchParams.get("seriesId") || undefined;

  // All ACTIVE series participate in advance generation (mode is fixed to ADVANCE globally)
  const where: any = { status: "ACTIVE" };
  if (branchId) where.branchId = branchId;
  if (singleSeriesId) where.seriesId = singleSeriesId;

  const list = await prisma.classSeries.findMany({
    where,
    orderBy: { updatedAt: "asc" },
    take: limit,
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let processed = 0;
  let upToDate = 0;
  let confirmed = 0;
  let conflicted = 0;
  let skipped = 0;
  const details: Array<any> = [];

  for (const s of list) {
    processed++;
    const cfg = await getEffectiveSchedulingConfig(s.branchId || undefined);
    const perSeriesLeadDays = leadDaysOverride
      ? Math.max(1, Number(leadDaysOverride))
      : Math.max(1, (cfg as any).generationMonths * 30);
    const { to } = computeAdvanceWindow(
      today,
      s.lastGeneratedThrough,
      s.startDate,
      s.endDate,
      perSeriesLeadDays
    );
    if (s.lastGeneratedThrough && s.lastGeneratedThrough >= to) {
      upToDate++;
      continue;
    }
    const res = await advanceGenerateForSeries(prisma as any, s.seriesId, {
      leadDays: perSeriesLeadDays,
    });
    confirmed += res.createdConfirmed;
    conflicted += res.createdConflicted;
    skipped += res.skipped;
    details.push({ ...res });
  }

  return NextResponse.json({
    processed,
    upToDate,
    created: { confirmed, conflicted },
    skipped,
    leadDays: leadDaysOverride ? Number(leadDaysOverride) : undefined,
    count: details.length,
    details,
  });
}
