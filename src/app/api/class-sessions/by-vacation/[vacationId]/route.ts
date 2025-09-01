// src/app/api/class-sessions/by-vacation/[vacationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE - Delete class sessions that conflict with a specific vacation
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const urlParts = request.url.split("/");
      const vacationId = urlParts[urlParts.length - 1];

      if (!vacationId) {
        return NextResponse.json(
          { error: "休日IDが必要です" },
          { status: 400 }
        );
      }

      const vacation = await prisma.vacation.findUnique({
        where: { id: vacationId },
        select: {
          id: true,
          branchId: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!vacation) {
        return NextResponse.json(
          { error: "休日が見つかりません" },
          { status: 404 }
        );
      }

      // Access control: non-admins can act if they are assigned to the vacation's branch
      if (session.user?.role !== "ADMIN") {
        const userBranches = (session.user?.branches || []).map((b: any) => b.branchId);
        if (!userBranches.includes(vacation.branchId)) {
          return NextResponse.json(
            { error: "この休日にアクセスする権限がありません" },
            { status: 403 }
          );
        }
      }

      // Find class sessions within the vacation's period for this branch
      const sessions = await prisma.classSession.findMany({
        where: {
          branchId: vacation.branchId,
          date: {
            gte: vacation.startDate,
            lte: vacation.endDate,
          },
        },
        select: { classId: true },
      });

      if (sessions.length === 0) {
        return NextResponse.json({ deleted: 0, message: "キャンセル対象の授業はありません" }, { status: 200 });
      }

      const classIds = sessions.map((s) => s.classId);

      // Delete enrollments first to satisfy FK constraints, then delete class sessions
      const [, deleteSessionsResult] = await prisma.$transaction([
        prisma.studentClassEnrollment.deleteMany({ where: { classId: { in: classIds } } }),
        prisma.classSession.deleteMany({ where: { classId: { in: classIds } } }),
      ]);

      const count = deleteSessionsResult.count;

      return NextResponse.json(
        { deleted: count, message: `${count}件の授業をキャンセルしました` },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting class sessions by vacation:", error);
      return NextResponse.json(
        { error: "授業のキャンセルに失敗しました" },
        { status: 500 }
      );
    }
  }
);
