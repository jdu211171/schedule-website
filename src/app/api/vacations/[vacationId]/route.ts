// src/app/api/vacations/[vacationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vacationUpdateSchema } from "@/schemas/vacation.schema";
import { Vacation } from "@prisma/client";

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

      const { name, startDate, endDate, isRecurring, notes, order } =
        result.data;

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

      // Update vacation
      const updatedVacation = await prisma.vacation.update({
        where: { id: vacationId },
        data: {
          name,
          startDate: startDateUTC,
          endDate: endDateUTC,
          isRecurring,
          notes,
          order,
        },
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
