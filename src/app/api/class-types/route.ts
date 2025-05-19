// src/app/api/class-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classTypeCreateSchema,
  classTypeFilterSchema,
} from "@/schemas/class-type.schema";
import { ClassType } from "@prisma/client";

type FormattedClassType = {
  classTypeId: string;
  name: string;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format classType response
const formatClassType = (
  classType: ClassType & { branch?: { name: string } | null }
): FormattedClassType => ({
  classTypeId: classType.classTypeId,
  name: classType.name,
  notes: classType.notes,
  branchId: classType.branchId || null,
  branchName: classType.branch?.name || null,
  createdAt: classType.createdAt,
  updatedAt: classType.updatedAt,
});

// GET - List class types with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = classTypeFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name } = result.data;

    // Build filter conditions
    const where: any = {};

    // For admins, allow filtering by branchId. For non-admins, enforce current branch
    if (session.user?.role === "ADMIN" && result.data.branchId) {
      where.branchId = result.data.branchId;
    } else if (session.user?.role !== "ADMIN") {
      where.branchId = branchId;
    }

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.classType.count({ where });

    // Fetch class types with branch
    const classTypes = await prisma.classType.findMany({
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

    // Format class types
    const formattedClassTypes = classTypes.map(formatClassType);

    return NextResponse.json({
      data: formattedClassTypes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new class type
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = classTypeCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, notes } = result.data;

      // For admin users, allow specifying branch. For others, use current branch
      const classTypeBranchId =
        session.user?.role === "ADMIN" && result.data.branchId
          ? result.data.branchId
          : branchId;

      // Check if class type name already exists in this branch
      const existingClassType = await prisma.classType.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          branchId: classTypeBranchId,
        },
      });

      if (existingClassType) {
        return NextResponse.json(
          { error: "クラスタイプ名は既に使用されています" }, // "Class type name already in use"
          { status: 409 }
        );
      }

      // Create class type
      const newClassType = await prisma.classType.create({
        data: {
          name,
          notes,
          branchId: classTypeBranchId,
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
      const formattedClassType = formatClassType(newClassType);

      return NextResponse.json(
        {
          data: [formattedClassType],
          message: "クラスタイプを作成しました",
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
      console.error("Error creating class type:", error);
      return NextResponse.json(
        { error: "クラスタイプの作成に失敗しました" }, // "Failed to create class type"
        { status: 500 }
      );
    }
  }
);
