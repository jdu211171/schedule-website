// src/app/api/vacations/[vacationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vacationUpdateSchema } from "@/schemas/vacation.schema";
import { Vacation } from "@prisma/client";
import { format } from "date-fns";

type FormattedVacation = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isRecurring: boolean;
  notes: string | null;
  order: number | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format vacation response
const formatVacation = (
  vacation: Vacation & { branch?: { name: string } | null }
): FormattedVacation => ({
  id: vacation.id,
  name: vacation.name,
  startDate: vacation.startDate,
  endDate: vacation.endDate,
  isRecurring: vacation.isRecurring,
  notes: vacation.notes || null,
  order: vacation.order || null,
  branchId: vacation.branchId || null,
  branchName: vacation.branch?.name || null,
  createdAt: vacation.createdAt,
  updatedAt: vacation.updatedAt,
});

// Helper function to create UTC date from date string or Date object
const createUTCDate = (dateInput: string | Date): Date => {
  if (dateInput instanceof Date) {
    // If it's already a Date object, extract the date parts and create UTC date
    const year = dateInput.getFullYear();
    const month = dateInput.getMonth();
    const day = dateInput.getDate();
    return new Date(Date.UTC(year, month, day));
  } else {
    // If it's a string, parse it and create UTC date
    const [year, month, day] = dateInput.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
};

// GET a specific vacation by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const vacationId = request.url.split("/").pop();

    if (!vacationId) {
      return NextResponse.json({ error: "休日IDが必要です" }, { status: 400 });
    }

    const vacation = await prisma.vacation.findUnique({
      where: { id: vacationId },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!vacation) {
      return NextResponse.json(
        { error: "休日が見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this vacation's branch (non-admin users)
    if (
      vacation.branchId &&
      vacation.branchId !== branchId &&
      session.user?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "この休日にアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Format response
    const formattedVacation = formatVacation(vacation);

    return NextResponse.json({
      data: [formattedVacation],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a vacation
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const vacationId = request.url.split("/").pop();
      if (!vacationId) {
        return NextResponse.json(
          { error: "休日IDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = vacationUpdateSchema.safeParse({ ...body, vacationId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if vacation exists
      const existingVacation = await prisma.vacation.findUnique({
        where: { id: vacationId },
      });

      if (!existingVacation) {
        return NextResponse.json(
          { error: "休日が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this vacation's branch (non-admin users)
      if (
        existingVacation.branchId &&
        existingVacation.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この休日にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const {
        name,
        startDate,
        endDate,
        isRecurring,
        notes,
        order,
        branchId: newBranchId,
        branchIds,
      } = result.data;

      // Convert dates to UTC if they are provided
      let startDateUTC, endDateUTC;

      if (startDate) {
        startDateUTC = createUTCDate(startDate);
      }

      if (endDate) {
        endDateUTC = createUTCDate(endDate);
      }

      // Ensure dates are valid if updating both
      if (startDateUTC && endDateUTC && startDateUTC > endDateUTC) {
        return NextResponse.json(
          { error: "開始日は終了日より前でなければなりません" },
          { status: 400 }
        );
      }

      // Prepare update payload
      const data: any = {
        name,
        startDate: startDateUTC,
        endDate: endDateUTC,
        isRecurring,
        notes,
        order,
      };

      // Allow branch assignment change
      if (typeof newBranchId !== "undefined") {
        if (session.user?.role === "ADMIN") {
          data.branchId = newBranchId || branchId; // Admin can reassign freely (required branch)
        } else {
          // Staff/Teacher: allow reassignment only within assigned branches
          const assignedBranchIds =
            session.user?.branches?.map((b: any) => b.branchId) || [];
          if (newBranchId && assignedBranchIds.includes(newBranchId)) {
            data.branchId = newBranchId;
          }
        }
      }

      // If syncing across multiple branches
      if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
        // Access control for non-admins
        if (session.user?.role !== "ADMIN") {
          const allowed = (session.user?.branches || []).map(
            (b: any) => b.branchId
          );
          const allAllowed = branchIds.every((b) => allowed.includes(b));
          if (!allAllowed) {
            return NextResponse.json(
              { error: "指定された校舎の一部にアクセス権がありません" },
              { status: 403 }
            );
          }
        }

        // Final values to apply
        const finalName = data.name ?? existingVacation.name;
        const finalStart = data.startDate ?? existingVacation.startDate;
        const finalEnd = data.endDate ?? existingVacation.endDate;
        const finalRecurring =
          typeof data.isRecurring === "boolean"
            ? data.isRecurring
            : existingVacation.isRecurring;
        const finalNotes = data.notes ?? existingVacation.notes;
        const finalOrder =
          typeof data.order !== "undefined"
            ? data.order
            : existingVacation.order;

        // Old group key (before changes) to find existing duplicates across branches
        const oldKey = {
          name: existingVacation.name,
          startDate: existingVacation.startDate,
          endDate: existingVacation.endDate,
          isRecurring: existingVacation.isRecurring,
        } as const;

        await prisma.$transaction(async (tx) => {
          // Upsert/update target branches
          for (const bId of branchIds) {
            const match = await tx.vacation.findFirst({
              where: {
                branchId: bId,
                name: oldKey.name,
                startDate: oldKey.startDate,
                endDate: oldKey.endDate,
                isRecurring: oldKey.isRecurring,
              },
              select: { id: true },
            });

            if (match) {
              await tx.vacation.update({
                where: { id: match.id },
                data: {
                  name: finalName,
                  startDate: finalStart,
                  endDate: finalEnd,
                  isRecurring: finalRecurring,
                  notes: finalNotes,
                  order: finalOrder,
                },
              });
            } else {
              await tx.vacation.create({
                data: {
                  name: finalName,
                  startDate: finalStart,
                  endDate: finalEnd,
                  isRecurring: finalRecurring,
                  notes: finalNotes ?? undefined,
                  order: finalOrder ?? undefined,
                  branchId: bId,
                },
              });
            }
          }

          // Delete extras from branches not selected (that still have old key)
          await tx.vacation.deleteMany({
            where: {
              branchId: { notIn: branchIds },
              name: oldKey.name,
              startDate: oldKey.startDate,
              endDate: oldKey.endDate,
              isRecurring: oldKey.isRecurring,
            },
          });
        });

        // Fetch all synced vacations for selected branches
        const updatedVacations = await prisma.vacation.findMany({
          where: {
            branchId: { in: branchIds },
            name: finalName,
            startDate: finalStart,
            endDate: finalEnd,
            isRecurring: finalRecurring,
          },
          include: { branch: { select: { name: true } } },
        });

        if (updatedVacations.length === 0) {
          return NextResponse.json(
            { error: "休日の同期後にデータが見つかりませんでした" },
            { status: 500 }
          );
        }

        // Retroactive conflict detection across all selected branches
        const vacationIds = updatedVacations.map((v) => v.id);
        const conflicts = await prisma.classSession.findMany({
          where: {
            branchId: { in: branchIds },
            date: { gte: finalStart, lte: finalEnd },
          },
          select: {
            classId: true,
            date: true,
            startTime: true,
            endTime: true,
            teacher: { select: { name: true } },
            student: { select: { name: true } },
          },
        });

        if (conflicts.length > 0) {
          return NextResponse.json(
            {
              data: updatedVacations.map(formatVacation),
              vacationIds,
              conflicts: conflicts.map((s) => ({
                classId: s.classId,
                date: format(s.date, "yyyy-MM-dd"),
                startTime: format(s.startTime, "HH:mm"),
                endTime: format(s.endTime, "HH:mm"),
                teacherName: s.teacher?.name ?? null,
                studentName: s.student?.name ?? null,
              })),
              requiresConfirmation: true,
            },
            { status: 409 }
          );
        }

        // No conflicts; return success
        return NextResponse.json({
          data: updatedVacations.map(formatVacation),
          message: "休日を更新しました",
          pagination: {
            total: updatedVacations.length,
            page: 1,
            limit: updatedVacations.length,
            pages: 1,
          },
        });
      }

      // Fallback: simple single-record update
      const updatedVacation = await prisma.vacation.update({
        where: { id: vacationId },
        data,
        include: {
          branch: {
            select: {
              name: true,
            },
          },
        },
      });

      // Format response
      const formattedVacation = formatVacation(updatedVacation);

      // Retroactive conflict detection after update
      const conflictBranchId = updatedVacation.branchId!;
      const conflictStart = updatedVacation.startDate;
      const conflictEnd = updatedVacation.endDate;

      const conflictingSessions = await prisma.classSession.findMany({
        where: {
          branchId: conflictBranchId,
          date: {
            gte: conflictStart,
            lte: conflictEnd,
          },
        },
        select: {
          classId: true,
          date: true,
          startTime: true,
          endTime: true,
          teacher: { select: { name: true } },
          student: { select: { name: true } },
        },
      });

      if (conflictingSessions.length > 0) {
        return NextResponse.json(
          {
            data: [formattedVacation],
            message:
              "この休日期間と重複する授業が見つかりました。キャンセルを確認してください。",
            conflicts: conflictingSessions.map((s) => ({
              classId: s.classId,
              date: format(s.date, "yyyy-MM-dd"),
              startTime: format(s.startTime, "HH:mm"),
              endTime: format(s.endTime, "HH:mm"),
              teacherName: s.teacher?.name ?? null,
              studentName: s.student?.name ?? null,
            })),
            requiresConfirmation: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        data: [formattedVacation],
        message: "休日を更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating vacation:", error);
      return NextResponse.json(
        { error: "休日の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a vacation
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const vacationId = request.url.split("/").pop();

    if (!vacationId) {
      return NextResponse.json({ error: "休日IDが必要です" }, { status: 400 });
    }

    try {
      // Check if vacation exists
      const vacation = await prisma.vacation.findUnique({
        where: { id: vacationId },
      });

      if (!vacation) {
        return NextResponse.json(
          { error: "休日が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this vacation's branch (non-admin users)
      if (
        vacation.branchId &&
        vacation.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この休日にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the vacation
      await prisma.vacation.delete({
        where: { id: vacationId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "休日を削除しました",
          pagination: {
            total: 0,
            page: 0,
            limit: 0,
            pages: 0,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting vacation:", error);
      return NextResponse.json(
        { error: "休日の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
