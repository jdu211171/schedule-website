import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BoothQuerySchema, CreateBoothSchema, UpdateBoothSchema } from "@/schemas/booth.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = BoothQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const { page, limit, name, status, sort, order } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (status !== undefined) {
      filters.status = status === "true";
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.booth.count({ where: filters });

    const booths = await prisma.booth.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
    });

    return Response.json({
      data: booths,
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
    return Response.json({ error: "Failed to fetch booths" }, { status: 500 });
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
    const data = CreateBoothSchema.parse(body);

    const booth = await prisma.booth.create({ data });

    return Response.json(
      {
        message: "Booth created successfully",
        data: booth,
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
    return Response.json({ error: "Failed to create booth" }, { status: 500 });
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
    const { boothId, ...data } = UpdateBoothSchema.parse(body);

    const existingBooth = await prisma.booth.findUnique({
      where: { boothId },
    });

    if (!existingBooth) {
      return Response.json({ error: "Booth not found" }, { status: 404 });
    }

    const booth = await prisma.booth.update({
      where: { boothId },
      data,
    });

    return Response.json({
      message: "Booth updated successfully",
      data: booth
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return Response.json({ error: "Failed to update booth" }, { status: 500 });
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
    const boothId = searchParams.get("boothId");

    if (!boothId) {
      return Response.json({ error: "Booth ID is required" }, { status: 400 });
    }

    const existingBooth = await prisma.booth.findUnique({
      where: { boothId },
    });

    if (!existingBooth) {
      return Response.json({ error: "Booth not found" }, { status: 404 });
    }

    const hasRelatedClassSessions = await prisma.classSession.findFirst({
      where: { boothId },
    });

    const hasRelatedTemplates = await prisma.regularClassTemplate.findFirst({
      where: { boothId },
    });

    if (hasRelatedClassSessions || hasRelatedTemplates) {
      return Response.json(
        {
          error: "Cannot delete booth with related class sessions or templates",
        },
        { status: 409 }
      );
    }

    await prisma.booth.delete({ where: { boothId } });

    return Response.json({
      message: "Booth deleted successfully",
    });
  } catch {
    return Response.json({ error: "Failed to delete booth" }, { status: 500 });
  }
}
