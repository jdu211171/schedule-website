// src/app/api/class-sessions/special-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function buildSpecialClassTypeChecker() {
  const cache = new Map<string, boolean>();

  const isSpecial = async (classTypeId: string | null | undefined): Promise<boolean> => {
    if (!classTypeId) return false;
    if (cache.has(classTypeId)) return cache.get(classTypeId)!;

    let currentId: string | null | undefined = classTypeId;
    let special = false;
    for (let i = 0; i < 12 && currentId; i++) {
      const ct: { name: string; parentId: string | null } | null = await prisma.classType.findUnique({
        where: { classTypeId: currentId },
        select: { name: true, parentId: true },
      });
      if (!ct) break;
      if (ct.name === "特別授業") {
        special = true;
        break;
      }
      currentId = ct.parentId;
    }
    cache.set(classTypeId, special);
    return special;
  };

  return { isSpecial };
}

export const GET = withBranchAccess(["ADMIN", "STAFF", "TEACHER"], async (request: NextRequest, _session, selectedBranchId) => {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const teacherId = searchParams.get("teacherId");

  if (!studentId && !teacherId) {
    return NextResponse.json({ error: "studentId or teacherId is required" }, { status: 400 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const whereBase: any = {
    branchId: selectedBranchId,
  };
  if (studentId) whereBase.studentId = studentId;
  if (teacherId) whereBase.teacherId = teacherId;

  const sessions = await prisma.classSession.findMany({
    where: whereBase,
    select: { date: true, isCancelled: true, classTypeId: true },
  });

  const { isSpecial } = await buildSpecialClassTypeChecker();
  const uniqueTypeIds = Array.from(new Set(sessions.map((s) => s.classTypeId).filter(Boolean))) as string[];
  await Promise.all(uniqueTypeIds.map((id) => isSpecial(id)));

  let takenSoFar = 0;
  let upcomingCount = 0;
  for (const s of sessions) {
    const special = await isSpecial(s.classTypeId as string | undefined);
    if (!special) continue;
    if (s.isCancelled) continue;
    if (s.date < today) takenSoFar += 1;
    else upcomingCount += 1;
  }

  return NextResponse.json({ takenSoFar, upcomingCount });
});

