// src/app/api/scheduling-config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedulingConfig } from "@/lib/scheduling-config";

function bool(v: any): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return undefined;
}

// GET effective and raw values. Admin sees global when no branchId param.
export const GET = withBranchAccess(["ADMIN", "STAFF"], async (request, session, selectedBranchId) => {
  const { searchParams } = new URL(request.url);
  const branchParam = searchParams.get('branchId');
  const scope = searchParams.get('scope'); // 'global' | 'branch'

  // Decide which branch to use (if any)
  let branchId: string | null = null;
  if (branchParam) branchId = branchParam;
  else if (scope === 'branch') branchId = selectedBranchId ?? null;

  // Staff can only query their selected branch; Admin can query any/global
  if (session.user?.role === 'STAFF') {
    branchId = selectedBranchId ?? null;
  }

  const [globalRow, branchRow] = await Promise.all([
    prisma.schedulingConfig.findFirst(),
    branchId ? prisma.branchSchedulingConfig.findUnique({ where: { branchId } }) : Promise.resolve(null),
  ]);

  const effective = await getEffectiveSchedulingConfig(branchId);

  return NextResponse.json({
    effective,
    global: globalRow || null,
    branch: branchRow || null,
  });
});

// PATCH global (ADMIN) or branch overrides (ADMIN or STAFF for own branch)
export const PATCH = withBranchAccess(["ADMIN", "STAFF"], async (request, session, selectedBranchId) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { scope, branchId: rawBranchId } = body as { scope?: 'global' | 'branch'; branchId?: string };

  if ((scope ?? 'branch') === 'global') {
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const data: any = {
      // Hard conflicts are informational; keep them true if provided
      markTeacherConflict: bool((body as any).markTeacherConflict) ?? true,
      markStudentConflict: bool((body as any).markStudentConflict) ?? true,
      markBoothConflict: bool((body as any).markBoothConflict) ?? true,
      markTeacherUnavailable: bool((body as any).markTeacherUnavailable),
      markStudentUnavailable: bool((body as any).markStudentUnavailable),
      markTeacherWrongTime: bool((body as any).markTeacherWrongTime),
      markStudentWrongTime: bool((body as any).markStudentWrongTime),
      markNoSharedAvailability: bool((body as any).markNoSharedAvailability),
      allowOutsideAvailabilityTeacher: bool((body as any).allowOutsideAvailabilityTeacher),
      allowOutsideAvailabilityStudent: bool((body as any).allowOutsideAvailabilityStudent),
      generationMonths: Math.max(1, Number((body as any).generationMonths ?? 1)),
    };
    const existing = await prisma.schedulingConfig.findFirst();
    const saved = existing
      ? await prisma.schedulingConfig.update({ where: { configId: existing.configId }, data })
      : await prisma.schedulingConfig.create({ data: { configId: 'GLOBAL', ...data } });
    return NextResponse.json({ saved });
  }

  // branch scope
  const branchId = session.user?.role === 'ADMIN' ? (rawBranchId ?? selectedBranchId) : selectedBranchId;
  if (!branchId) {
    return NextResponse.json({ error: 'Missing branchId' }, { status: 400 });
  }
  const data: any = {
    markTeacherConflict: bool((body as any).markTeacherConflict),
    markStudentConflict: bool((body as any).markStudentConflict),
    markBoothConflict: bool((body as any).markBoothConflict),
    markTeacherUnavailable: bool((body as any).markTeacherUnavailable),
    markStudentUnavailable: bool((body as any).markStudentUnavailable),
    markTeacherWrongTime: bool((body as any).markTeacherWrongTime),
    markStudentWrongTime: bool((body as any).markStudentWrongTime),
    markNoSharedAvailability: bool((body as any).markNoSharedAvailability),
    allowOutsideAvailabilityTeacher: bool((body as any).allowOutsideAvailabilityTeacher),
    allowOutsideAvailabilityStudent: bool((body as any).allowOutsideAvailabilityStudent),
    generationMonths: (body as any).generationMonths !== undefined ? Math.max(1, Number((body as any).generationMonths)) : undefined,
  };
  // Remove undefined keys to avoid writing NULL unintentionally when not provided
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

  const saved = await prisma.branchSchedulingConfig.upsert({
    where: { branchId },
    update: data,
    create: { branchId, ...data },
  });
  return NextResponse.json({ saved });
});
