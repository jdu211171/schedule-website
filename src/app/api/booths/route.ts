// src/app/api/booths/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { boothCreateSchema, boothFilterSchema } from "@/schemas/booth.schema";
import { Booth } from "@prisma/client";

type FormattedBooth = {
  boothId: string;
  branchId: string;
  branchName: string;
  name: string;
  status: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format booth response
const formatBooth = (
  booth: Booth & { branch: { name: string } }
): FormattedBooth => ({
  boothId: booth.boothId,
  branchId: booth.branchId,
  branchName: booth.branch.name,
  name: booth.name,
  status: booth.status ?? true,
  notes: booth.notes,
  createdAt: booth.createdAt,
  updatedAt: booth.updatedAt,
});

// GET - List booths with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = boothFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name, status } = result.data;

    // Build filter conditions
    const where: any = {
      branchId,
    };

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    if (status !== undefined) {
      where.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.booth.count({ where });

    // Fetch booths with branch
    const booths = await prisma.booth.findMany({
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
      orderBy: { name: "asc" },
    });

    // Format booths
    const formattedBooths = booths.map(formatBooth);

    return NextResponse.json({
      data: formattedBooths,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new booth
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = boothCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, status, notes } = result.data;

      // Check if booth name already exists in this branch
      const existingBooth = await prisma.booth.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          branchId,
        },
      });

      if (existingBooth) {
        return NextResponse.json(
          { error: "ブース名は既に使用されています" }, // "Booth name already in use"
          { status: 409 }
        );
      }

      console.log("Creating booth with data:", {
        name,
        status,
        notes,
        branchId,
      });

      // Create booth
      const newBooth = await prisma.booth.create({
        data: {
          name,
          status,
          notes,
          branchId,
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
      const formattedBooth = formatBooth(newBooth);

      return NextResponse.json(
        {
          data: [formattedBooth],
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
      console.error("Error creating booth:", error);
      return NextResponse.json(
        { error: "ブースの作成に失敗しました" }, // "Failed to create booth"
        { status: 500 }
      );
    }
  }
);
