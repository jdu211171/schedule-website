// src/app/api/events/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/schemas/event.schema";
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

// GET a specific event by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const eventId = request.url.split("/").pop();

    if (!eventId) {
      return NextResponse.json(
        { error: "イベントIDが必要です" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this event's branch (non-admin users)
    if (
      event.branchId &&
      event.branchId !== branchId &&
      session.user?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "このイベントにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Format response
    const formattedEvent = formatEvent(event);

    return NextResponse.json({
      data: [formattedEvent],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update an event
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const eventId = request.url.split("/").pop();
      if (!eventId) {
        return NextResponse.json(
          { error: "イベントIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = eventUpdateSchema.safeParse({ ...body, eventId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if event exists
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existingEvent) {
        return NextResponse.json(
          { error: "イベントが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this event's branch (non-admin users)
      if (
        existingEvent.branchId &&
        existingEvent.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このイベントにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const { name, startDate, endDate, isRecurring, notes } = result.data;

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

      // Update event
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          name,
          startDate: startDateUTC,
          endDate: endDateUTC,
          isRecurring,
          notes,
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
      const formattedEvent = formatEvent(updatedEvent);

      return NextResponse.json({
        data: [formattedEvent],
        message: "イベントを更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating event:", error);
      return NextResponse.json(
        { error: "イベントの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete an event
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const eventId = request.url.split("/").pop();

    if (!eventId) {
      return NextResponse.json(
        { error: "イベントIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return NextResponse.json(
          { error: "イベントが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this event's branch (non-admin users)
      if (
        event.branchId &&
        event.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このイベントにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the event
      await prisma.event.delete({
        where: { id: eventId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "イベントを削除しました",
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
      console.error("Error deleting event:", error);
      return NextResponse.json(
        { error: "イベントの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
