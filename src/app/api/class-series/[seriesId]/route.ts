// src/app/api/class-series/[seriesId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSeriesUpdateSchema } from "@/schemas/class-series.schema";
import { classSessionSeriesUpdateSchema } from "@/schemas/class-session.schema";
// generation mode removed; advance generation handled globally via cron/extend
import {
  getEffectiveSchedulingConfig,
  toPolicyShape,
  upsertBranchPolicyFromSeriesPatch,
} from "@/lib/scheduling-config";

type ClassSeriesRow = {
  seriesId: string;
  branchId: string | null;
  teacherId: string | null;
  studentId: string | null;
  subjectId: string | null;
  classTypeId: string | null;
  boothId: string | null;
  startDate: Date;
  endDate: Date | null;
  startTime: Date;
  endTime: Date;
  duration: number | null;
  daysOfWeek: unknown;
  status: string;
  lastGeneratedThrough: Date | null;
  // centralized; not stored on series
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClassSeriesResponse = {
  seriesId: string;
  branchId: string | null;
  teacherId: string | null;
  studentId: string | null;
  subjectId: string | null;
  classTypeId: string | null;
  boothId: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  duration: number | null;
  daysOfWeek: number[];
  status: string;
  lastGeneratedThrough: string | null;
  conflictPolicy: Record<string, any> | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function fmtDate(d: Date | null): string | null {
  if (!d) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmtTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toResponse(row: ClassSeriesRow): ClassSeriesResponse {
  const daysRaw = row.daysOfWeek as any;
  const days: number[] = Array.isArray(daysRaw)
    ? daysRaw.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : [];

  return {
    seriesId: row.seriesId,
    branchId: row.branchId,
    teacherId: row.teacherId,
    studentId: row.studentId,
    subjectId: row.subjectId,
    classTypeId: row.classTypeId,
    boothId: row.boothId,
    startDate: fmtDate(row.startDate)!,
    endDate: fmtDate(row.endDate),
    startTime: fmtTime(row.startTime),
    endTime: fmtTime(row.endTime),
    duration: row.duration,
    daysOfWeek: days,
    status: row.status,
    lastGeneratedThrough: fmtDate(row.lastGeneratedThrough),
    conflictPolicy: null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, selectedBranchId) => {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const seriesId = parts[parts.length - 1];

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    const row = await prisma.classSeries.findUnique({ where: { seriesId } });
    if (!row) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    // Enforce branch access for non-admins
    const isAdmin = session.user?.role === "ADMIN";
    if (!isAdmin) {
      if (row.branchId && row.branchId !== selectedBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const base = toResponse(row as unknown as ClassSeriesRow);
    const cfg = await getEffectiveSchedulingConfig(base.branchId);
    return NextResponse.json({
      ...base,
      conflictPolicy: toPolicyShape(cfg) as any,
    });
  }
);

function parseDateToUTC(dateStr: string): Date {
  // YYYY-MM-DD to UTC date (00:00)
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, (m as number) - 1, d));
}

function parseTimeToUTC(timeStr: string): Date {
  // HH:mm to a UTC time-only Date (anchor date 2000-01-01)
  const [hh, mm] = timeStr.split(":").map((v) => Number(v));
  return new Date(Date.UTC(2000, 0, 1, hh, mm, 0, 0));
}

// PATCH — update blueprint and propagate to future sessions
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request, session, selectedBranchId) => {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const seriesId = parts[parts.length - 1];

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Extended control flags (not part of zod schema):
    // - skipPropagation: do not propagate to existing sessions (UI may have updated them separately)
    // - propagateFromClassId: when propagating, apply from a specific instance forward
    const skipPropagation = Boolean((body as any)?.skipPropagation);
    const propagateFromClassId: string | undefined =
      typeof (body as any)?.propagateFromClassId === "string"
        ? (body as any).propagateFromClassId
        : undefined;

    const parsed = classSeriesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Fetch existing series (guard against orphans) and gather needed fields
    const existing = await prisma.classSeries.findUnique({
      where: { seriesId },
      select: {
        branchId: true,
        startTime: true,
        endTime: true,
        lastGeneratedThrough: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    const isAdmin = session.user?.role === "ADMIN";
    if (!isAdmin) {
      // Cannot patch a series outside selected branch
      if (existing.branchId && existing.branchId !== selectedBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Cannot switch to another branch
      if (input.branchId && input.branchId !== selectedBranchId) {
        return NextResponse.json(
          { error: "Forbidden: invalid branch" },
          { status: 403 }
        );
      }
    }

    // Build Prisma update payload
    const data: any = {};
    if (input.branchId !== undefined) data.branchId = input.branchId ?? null;
    if (input.teacherId !== undefined) data.teacherId = input.teacherId ?? null;
    if (input.studentId !== undefined) data.studentId = input.studentId ?? null;
    if (input.subjectId !== undefined) data.subjectId = input.subjectId ?? null;
    if (input.classTypeId !== undefined)
      data.classTypeId = input.classTypeId ?? null;
    if (input.boothId !== undefined) data.boothId = input.boothId ?? null;
    if (input.startDate !== undefined)
      data.startDate = parseDateToUTC(input.startDate);
    if (input.endDate !== undefined)
      data.endDate = input.endDate ? parseDateToUTC(input.endDate) : null;
    const hasStartTime = input.startTime !== undefined;
    const hasEndTime = input.endTime !== undefined;
    if (hasStartTime)
      data.startTime = parseTimeToUTC(input.startTime as string);
    if (hasEndTime) data.endTime = parseTimeToUTC(input.endTime as string);
    if (input.duration !== undefined) data.duration = input.duration ?? null;
    if (input.daysOfWeek !== undefined)
      data.daysOfWeek = input.daysOfWeek as any;
    if (input.status !== undefined) data.status = input.status;
    if (input.lastGeneratedThrough !== undefined)
      data.lastGeneratedThrough = input.lastGeneratedThrough
        ? parseDateToUTC(input.lastGeneratedThrough)
        : null;
    // Centralized policy: update branch-level overrides when provided
    if (input.conflictPolicy !== undefined) {
      // Need branchId to persist overrides; use input or existing
      const effectiveBranchId = (input.branchId ?? existing.branchId) || null;
      if (effectiveBranchId) {
        await upsertBranchPolicyFromSeriesPatch(
          effectiveBranchId,
          (input.conflictPolicy as any) || {}
        );
      }
    }
    if (input.notes !== undefined) data.notes = input.notes ?? null;

    // If endDate was shortened before the previous lastGeneratedThrough, clamp it down
    if (
      data.endDate &&
      existing.lastGeneratedThrough &&
      existing.lastGeneratedThrough > data.endDate
    ) {
      (data as any).lastGeneratedThrough = data.endDate;
    }

    // If times changed and duration not explicitly provided, recompute duration from new times
    if ((hasStartTime || hasEndTime) && input.duration === undefined) {
      try {
        const s =
          (hasStartTime ? (data.startTime as Date) : undefined) ??
          existing.startTime;
        const e =
          (hasEndTime ? (data.endTime as Date) : undefined) ?? existing.endTime;
        if (s && e && e > s) {
          (data as any).duration = Math.round(
            (e.getTime() - s.getTime()) / (1000 * 60)
          );
        }
      } catch {
        // ignore
      }
    }

    const updated = await prisma.classSeries.update({
      where: { seriesId },
      data,
    });

    // Prepare payload to propagate to class sessions (only intersecting fields)
    const propagate: any = { seriesId };
    let shouldPropagate = false;
    for (const k of [
      "teacherId",
      "studentId",
      "subjectId",
      "classTypeId",
      "boothId",
      "startTime",
      "endTime",
      "duration",
      "notes",
    ] as const) {
      if (k in input) {
        // pass through original string/number values per seriesUpdate contract
        (propagate as any)[k] = (input as any)[k];
        shouldPropagate = true;
      }
    }

    let propagateResult: { ok: boolean; status?: number; error?: any } | null =
      null;
    if (shouldPropagate && !skipPropagation) {
      // Validate against class-session series schema before sending
      const seriesPatch = classSessionSeriesUpdateSchema.safeParse(propagate);
      if (seriesPatch.success) {
        try {
          const origin = new URL(request.url).origin;
          const res = await fetch(
            `${origin}/api/class-sessions/series/${seriesId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                // Forward auth/session & branch context
                Cookie: request.headers.get("cookie") || "",
                "X-Selected-Branch":
                  request.headers.get("X-Selected-Branch") || selectedBranchId,
              },
              body: JSON.stringify({
                ...seriesPatch.data,
                fromClassId: propagateFromClassId,
              }),
            }
          );
          propagateResult = { ok: res.ok, status: res.status };
        } catch (err) {
          propagateResult = { ok: false, error: String(err) };
        }
      }
    }

    const base = toResponse(updated as unknown as ClassSeriesRow);
    const cfg = await getEffectiveSchedulingConfig(base.branchId);
    const response = {
      ...base,
      conflictPolicy: toPolicyShape(cfg) as any,
      _propagation: propagateResult ?? undefined,
    };

    return NextResponse.json(response);
  }
);

// DELETE — delete only the series blueprint; keep any generated class sessions
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request, session, selectedBranchId) => {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const seriesId = parts[parts.length - 1];

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    const series = await prisma.classSeries.findUnique({ where: { seriesId } });
    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    // Enforce branch access for non-admins
    const isAdmin = session.user?.role === "ADMIN";
    if (!isAdmin) {
      if (series.branchId && series.branchId !== selectedBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const delSeries = await prisma.classSeries.delete({ where: { seriesId } });
    return NextResponse.json({ deletedSeriesId: delSeries.seriesId });
  }
);
