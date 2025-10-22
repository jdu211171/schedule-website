// src/app/api/class-series/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSeriesCreateSchema } from "@/schemas/class-series.schema";
import {
  getEffectiveSchedulingConfig,
  toPolicyShape,
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
  startTime: Date; // stored as time in DB
  endTime: Date; // stored as time in DB
  duration: number | null;
  daysOfWeek: unknown; // JSON
  status: string;
  lastGeneratedThrough: Date | null;
  // centralized config; not stored on series
  // conflictPolicy removed from table
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClassSeriesResponse = {
  seriesId: string;
  branchId: string | null;
  teacherId: string | null;
  teacherName?: string | null;
  studentId: string | null;
  studentName?: string | null;
  subjectId: string | null;
  subjectName?: string | null;
  classTypeId: string | null;
  classTypeName?: string | null;
  boothId: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number | null;
  daysOfWeek: number[]; // [1,3,5]
  status: string;
  lastGeneratedThrough: string | null; // YYYY-MM-DD
  conflictPolicy: Record<string, any> | null;
  notes: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  conflictCount?: number; // number of CONFLICTED sessions for this series
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
    const { searchParams } = new URL(request.url);

    const teacherId = searchParams.get("teacherId") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const status = searchParams.get("status") || undefined;
    const branchParam = searchParams.get("branchId") || undefined;

    // Enforce branch scoping: Non-admins are limited to their selected branch
    const isAdmin = session.user?.role === "ADMIN";
    const effectiveBranchId = isAdmin
      ? branchParam || selectedBranchId
      : selectedBranchId;

    const where: any = {};
    if (effectiveBranchId) where.branchId = effectiveBranchId;
    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const rows = await prisma.classSeries.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
    });

    // Resolve names for display
    const base = rows.map((r) => toResponse(r as unknown as ClassSeriesRow));
    const teacherIds = Array.from(
      new Set(base.map((b) => b.teacherId).filter(Boolean))
    ) as string[];
    const studentIds = Array.from(
      new Set(base.map((b) => b.studentId).filter(Boolean))
    ) as string[];
    const subjectIds = Array.from(
      new Set(base.map((b) => b.subjectId).filter(Boolean))
    ) as string[];
    const classTypeIds = Array.from(
      new Set(base.map((b) => b.classTypeId).filter(Boolean))
    ) as string[];
    const seriesIds = base.map((b) => b.seriesId);

    const [teachers, students, subjects, classTypes, conflictedCounts] =
      await Promise.all([
        teacherIds.length
          ? prisma.teacher.findMany({
              where: { teacherId: { in: teacherIds } },
              select: { teacherId: true, name: true },
            })
          : Promise.resolve([] as Array<{ teacherId: string; name: string }>),
        studentIds.length
          ? prisma.student.findMany({
              where: { studentId: { in: studentIds } },
              select: { studentId: true, name: true },
            })
          : Promise.resolve([] as Array<{ studentId: string; name: string }>),
        subjectIds.length
          ? prisma.subject.findMany({
              where: { subjectId: { in: subjectIds } },
              select: { subjectId: true, name: true },
            })
          : Promise.resolve([] as Array<{ subjectId: string; name: string }>),
        classTypeIds.length
          ? prisma.classType.findMany({
              where: { classTypeId: { in: classTypeIds } },
              select: { classTypeId: true, name: true },
            })
          : Promise.resolve([] as Array<{ classTypeId: string; name: string }>),
        seriesIds.length
          ? prisma.classSession.groupBy({
              by: ["seriesId"],
              where: {
                seriesId: { in: seriesIds },
                status: "CONFLICTED",
              },
              _count: { _all: true },
            })
          : Promise.resolve(
              [] as Array<{ seriesId: string | null; _count: { _all: number } }>
            ),
      ]);
    const tMap = new Map(teachers.map((t) => [t.teacherId, t.name]));
    const sMap = new Map(students.map((s) => [s.studentId, s.name]));
    const subjMap = new Map(subjects.map((s) => [s.subjectId, s.name]));
    const ctMap = new Map(classTypes.map((c) => [c.classTypeId, c.name]));
    const cMap = new Map<string, number>();
    for (const g of conflictedCounts) {
      if (g.seriesId) cMap.set(g.seriesId, g._count._all);
    }

    const data = await Promise.all(
      base.map(async (b) => {
        const cfg = await getEffectiveSchedulingConfig(b.branchId);
        const item: ClassSeriesResponse = {
          ...b,
          conflictPolicy: toPolicyShape(cfg) as any,
          teacherName: b.teacherId ? (tMap.get(b.teacherId) ?? null) : null,
          studentName: b.studentId ? (sMap.get(b.studentId) ?? null) : null,
          subjectName: b.subjectId ? (subjMap.get(b.subjectId) ?? null) : null,
          classTypeName: b.classTypeId
            ? (ctMap.get(b.classTypeId) ?? null)
            : null,
          conflictCount: cMap.get(b.seriesId) ?? 0,
        };
        return item;
      })
    );

    // Prioritize by conflictCount desc, then updatedAt desc
    data.sort((a, b) => {
      const ca = a.conflictCount ?? 0;
      const cb = b.conflictCount ?? 0;
      if (cb !== ca) return cb - ca;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json(data);
  }
);

function parseDateToUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, (m as number) - 1, d));
}

function parseTimeToUTC(timeStr: string): Date {
  const [hh, mm] = timeStr.split(":").map((v) => Number(v));
  return new Date(Date.UTC(2000, 0, 1, hh, mm, 0, 0));
}

async function isSpecialClassType(
  classTypeId?: string | null
): Promise<boolean> {
  if (!classTypeId) return false;
  try {
    let currentId: string | null | undefined = classTypeId;
    for (let i = 0; i < 12 && currentId; i++) {
      const ct: { name: string; parentId: string | null } | null =
        await prisma.classType.findUnique({
          where: { classTypeId: currentId },
          select: { name: true, parentId: true },
        });
      if (!ct) break;
      if (ct.name === "特別授業") return true;
      currentId = ct.parentId;
    }
  } catch (_) {
    return false;
  }
  return false;
}

export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, selectedBranchId) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = classSeriesCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Reject special class types
    if (await isSpecialClassType(input.classTypeId)) {
      return NextResponse.json(
        {
          error: "Special class types are not supported for series blueprints",
        },
        { status: 400 }
      );
    }

    // Branch scoping: for non-admin, enforce selected branch
    const isAdmin = session.user?.role === "ADMIN";
    const effectiveBranchId = isAdmin
      ? (input.branchId ?? selectedBranchId ?? null)
      : selectedBranchId;
    if (!isAdmin) {
      if (input.branchId && input.branchId !== selectedBranchId) {
        return NextResponse.json(
          { error: "Forbidden: invalid branch" },
          { status: 403 }
        );
      }
    }

    // Idempotency: prevent duplicate ACTIVE blueprints for same private pair/time/days in the same branch
    if (input.teacherId && input.studentId) {
      const existing = await prisma.classSeries.findFirst({
        where: {
          status: "ACTIVE",
          branchId: input.branchId ?? selectedBranchId ?? undefined,
          teacherId: input.teacherId,
          studentId: input.studentId,
          startTime: parseTimeToUTC(input.startTime),
          endTime: parseTimeToUTC(input.endTime),
          // Note: jsonb equality is order-sensitive for arrays; callers should submit normalized arrays
          daysOfWeek: input.daysOfWeek as any,
        },
        select: { seriesId: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Duplicate series exists", seriesId: existing.seriesId },
          { status: 409 }
        );
      }
    }

    const seriesId = crypto.randomUUID();
    const data: any = {
      seriesId,
      branchId: effectiveBranchId ?? null,
      teacherId: input.teacherId ?? null,
      studentId: input.studentId ?? null,
      subjectId: input.subjectId ?? null,
      classTypeId: input.classTypeId ?? null,
      boothId: input.boothId ?? null,
      startDate: parseDateToUTC(input.startDate),
      endDate: input.endDate ? parseDateToUTC(input.endDate) : null,
      startTime: parseTimeToUTC(input.startTime),
      endTime: parseTimeToUTC(input.endTime),
      duration: input.duration ?? null,
      daysOfWeek: input.daysOfWeek as any,
      status: input.status ?? "ACTIVE",
      // Restore behavior: honor client-provided lastGeneratedThrough on create.
      // Caller can seed this when migrating or recreating series to avoid re-generation.
      lastGeneratedThrough: input.lastGeneratedThrough
        ? parseDateToUTC(input.lastGeneratedThrough)
        : null,
      notes: input.notes ?? null,
    };

    await prisma.classSeries.create({ data });
    return NextResponse.json({ seriesId }, { status: 200 });
  }
);
