import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  EventQuerySchema,
  CreateEventSchema,
  UpdateEventSchema,
} from "@/schemas/event.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = EventQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, startDate, endDate, isRecurring, sort, order } =
      query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (startDate) {
      filters.startDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      filters.endDate = { lte: new Date(endDate) };
    }

    if (isRecurring !== undefined) {
      filters.isRecurring = isRecurring === "true";
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.event.count({ where: filters });

    const events = await prisma.event.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
    });

    return Response.json({
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = CreateEventSchema.parse(body);

    const event = await prisma.event.create({ data });

    return Response.json(
      {
        message: "イベントの作成に成功しました", // "Event created successfully"
        data: event,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...data } = UpdateEventSchema.parse(body);

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    return Response.json({
      message: "イベントの更新に成功しました", // "Event updated successfully"
      data: event,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Event ID is required" }, { status: 400 });
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });

    return Response.json({
      message: "イベントの削除に成功しました", // "Event deleted successfully"
    });
  } catch {
    return Response.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
