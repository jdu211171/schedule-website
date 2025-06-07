// src/app/api/vacations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  vacationCreateSchema,
  vacationFilterSchema,
} from "@/schemas/vacation.schema";
import { Vacation, Prisma } from "@prisma/client";

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

// GET - List vacations with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = vacationFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      name,
      startDate,
      endDate,
      isRecurring,
      sortBy,
      sortOrder,
    } = result.data;

    // Build filter conditions
    const where: any = {};

    // If a specific branchId is provided in the request, use that
    if (result.data.branchId) {
      where.branchId = result.data.branchId;
    }
    // Otherwise use the user's current branch unless they are an admin
    else if (session.user?.role !== "ADMIN") {
      where.branchId = branchId;
    }

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    if (startDate) {
      where.startDate = {
        gte: createUTCDate(startDate),
      };
    }

    if (endDate) {
      where.endDate = {
        lte: createUTCDate(endDate),
      };
    }

    if (isRecurring !== undefined) {
      where.isRecurring = isRecurring;
    }

    // Build order by conditions - prioritize order field like branches
    const orderBy: Prisma.VacationOrderByWithRelationInput[] = [];

    if (sortBy === "order") {
      orderBy.push(
        { order: { sort: sortOrder, nulls: "last" } },
        { name: "asc" } // Secondary sort by name for vacations with same order
      );
    } else {
      orderBy.push({ [sortBy]: sortOrder });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.vacation.count({ where });

    // Fetch vacations with branch
    const vacations = await prisma.vacation.findMany({
      where,
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    });

    // Format vacations
    const formattedVacations = vacations.map(formatVacation);

    return NextResponse.json({
      data: formattedVacations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new vacation
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = vacationCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, startDate, endDate, isRecurring, notes, order } =
        result.data;

      // Convert dates to UTC to avoid timezone issues
      const startDateUTC = createUTCDate(startDate);
      const endDateUTC = createUTCDate(endDate);

      // Ensure dates are valid
      if (startDateUTC > endDateUTC) {
        return NextResponse.json(
          { error: "開始日は終了日より前でなければなりません" },
          { status: 400 }
        );
      }

      // For admin users, allow specifying branch. For others, use current branch
      const vacationBranchId =
        session.user?.role === "ADMIN" && result.data.branchId
          ? result.data.branchId
          : branchId;

      // Determine the order value
      let finalOrder = order;
      if (!finalOrder) {
        // Get the current maximum order value for vacations in the same branch (or global if no branch)
        const maxOrderResult = await prisma.vacation.aggregate({
          _max: {
            order: true,
          },
          where: {
            branchId: vacationBranchId,
          },
        });
        finalOrder = maxOrderResult._max.order
          ? maxOrderResult._max.order + 1
          : 1;
      }

      // Create vacation
      const newVacation = await prisma.vacation.create({
        data: {
          name,
          startDate: startDateUTC,
          endDate: endDateUTC,
          isRecurring,
          notes,
          order: finalOrder,
          branchId: vacationBranchId,
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
      const formattedVacation = formatVacation(newVacation);

      return NextResponse.json(
        {
          data: [formattedVacation],
          message: "休日を作成しました",
          pagination: {
            total: 1,
            page: 1,
            limit: 1,
            pages: 1,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating vacation:", error);
      return NextResponse.json(
        { error: "休日の作成に失敗しました" }, // "Failed to create vacation"
        { status: 500 }
      );
    }
  }
);
