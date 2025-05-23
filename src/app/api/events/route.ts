// src/app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventCreateSchema, eventFilterSchema } from "@/schemas/event.schema";
import { Event } from "@prisma/client";

type FormattedEvent = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isRecurring: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format event response
const formatEvent = (
  event: Event & { branch?: { name: string } | null }
): FormattedEvent => ({
  id: event.id,
  name: event.name,
  startDate: event.startDate,
  endDate: event.endDate,
  isRecurring: event.isRecurring,
  notes: event.notes || null,
  branchId: event.branchId || null,
  branchName: event.branch?.name || null,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
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

// GET - List events with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = eventFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name, startDate, endDate, isRecurring } = result.data;

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

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.event.count({ where });

    // Fetch events with branch
    const events = await prisma.event.findMany({
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
      orderBy: { startDate: "asc" },
    });

    // Format events
    const formattedEvents = events.map(formatEvent);

    return NextResponse.json({
      data: formattedEvents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new event
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = eventCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, startDate, endDate, isRecurring, notes } = result.data;

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
      const eventBranchId =
        session.user?.role === "ADMIN" && result.data.branchId
          ? result.data.branchId
          : branchId;

      // Create event
      const newEvent = await prisma.event.create({
        data: {
          name,
          startDate: startDateUTC,
          endDate: endDateUTC,
          isRecurring,
          notes,
          branchId: eventBranchId,
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
      const formattedEvent = formatEvent(newEvent);

      return NextResponse.json(
        {
          data: [formattedEvent],
          message: "イベントを作成しました",
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
      console.error("Error creating event:", error);
      return NextResponse.json(
        { error: "イベントの作成に失敗しました" }, // "Failed to create event"
        { status: 500 }
      );
    }
  }
);
