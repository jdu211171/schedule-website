// src/app/api/class-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classTypeCreateSchema,
  classTypeFilterSchema,
} from "@/schemas/class-type.schema";
import { ClassType, Prisma } from "@prisma/client";

type ClassTypeWithRelations = ClassType & {
  parent?: ClassType | null;
  children?: ClassType[];
};

type FormattedClassType = {
  classTypeId: string;
  name: string;
  notes: string | null;
  parentId: string | null;
  order: number | null;
  color: string | null;
  visibleInFilters: boolean;
  parent?: FormattedClassType | null;
  children?: FormattedClassType[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format classType response
const formatClassType = (
  classType: ClassTypeWithRelations
): FormattedClassType => ({
  classTypeId: classType.classTypeId,
  name: classType.name,
  notes: classType.notes,
  parentId: classType.parentId,
  order: classType.order,
  color: (classType as any).color ?? null,
  visibleInFilters: Boolean((classType as any).visibleInFilters ?? true),
  parent: classType.parent ? formatClassType(classType.parent) : undefined,
  children: classType.children?.map(formatClassType),
  createdAt: classType.createdAt,
  updatedAt: classType.updatedAt,
});

// Helper function to validate hierarchy (prevent cycles)
const validateHierarchy = async (
  classTypeId: string,
  parentId: string
): Promise<boolean> => {
  if (classTypeId === parentId) {
    return false; // Cannot be parent of itself
  }

  // Check if parentId would create a cycle by traversing up the hierarchy
  let currentParentId: string | null = parentId;
  while (currentParentId) {
    if (currentParentId === classTypeId) {
      return false; // Cycle detected
    }

    const parentClassType: any = await prisma.classType.findUnique({
      where: { classTypeId: currentParentId },
      select: { parentId: true },
    });

    currentParentId = parentClassType?.parentId || null;
  }

  return true;
};

// GET - List class types with pagination and filters
export const GET = withRole(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"],
  async (request: NextRequest, session) => {
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

    const {
      page,
      limit,
      name,
      parentId,
      includeChildren,
      includeParent,
      visibleOnly,
      sortBy,
      sortOrder,
    } = result.data;

    // Build filter conditions
    const where: any = {};
    if (visibleOnly) {
      where.visibleInFilters = true;
    }

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    // Filter by parentId (including null for top-level)
    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    // Build include conditions
    const include: any = {};
    if (includeParent) {
      include.parent = true;
    }
    if (includeChildren) {
      include.children = {
        orderBy: { name: "asc" },
      };
    }

    // Build ordering - ALWAYS sort by order field first to maintain admin-defined sequence
    const orderBy: Prisma.ClassTypeOrderByWithRelationInput[] = [];

    if (sortBy === "order") {
      orderBy.push({ order: { sort: sortOrder, nulls: "last" } });
      orderBy.push({ name: "asc" }); // Secondary sort by name for class types with same order
    } else {
      orderBy.push({ [sortBy]: sortOrder });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.classType.count({ where });

    // Fetch class types
    const classTypes = await prisma.classType.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy,
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
export const POST = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
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

      const { name, notes, parentId, order, color } = result.data;

      // Check if class type name already exists within the same parent context
      const existingClassType = await prisma.classType.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          parentId: parentId || null, // Check within same parent (null for root level)
        },
      });

      if (existingClassType) {
        const errorMessage = parentId
          ? "この親授業タイプ内で、同じ名前の授業タイプが既に存在します" // "A class type with this name already exists under this parent"
          : "同じ名前のルート授業タイプが既に存在します"; // "A root class type with this name already exists"
        return NextResponse.json({ error: errorMessage }, { status: 409 });
      }

      // If parentId is provided, validate it exists
      if (parentId) {
        const parentExists = await prisma.classType.findUnique({
          where: { classTypeId: parentId },
        });

        if (!parentExists) {
          return NextResponse.json(
            { error: "指定された親授業タイプが見つかりません" }, // "Specified parent class type not found"
            { status: 400 }
          );
        }
      }

      // If color provided, ensure uniqueness (best-effort for older schemas)
      if (color) {
        try {
          const colorInUse = await prisma.classType.findFirst({
            where: { color: { equals: color, mode: "insensitive" } as any },
            select: { classTypeId: true },
          });
          if (colorInUse) {
            return NextResponse.json(
              { error: "この色は別の授業タイプで利用されています" },
              { status: 409 }
            );
          }
        } catch {
          // Schema might not have `color`; skip uniqueness check gracefully
        }
      }

      // Determine the order value
      let finalOrder = order;
      if (!finalOrder) {
        // Get the current maximum order value
        const maxOrderResult = await prisma.classType.aggregate({
          _max: {
            order: true,
          },
        });
        finalOrder = maxOrderResult._max.order
          ? maxOrderResult._max.order + 1
          : 1;
      }

      console.log("Creating class type with data:", {
        name,
        notes,
        parentId,
        order: finalOrder,
      });

      // Create class type (tolerate older schemas without `color` field)
      let newClassType: any;
      try {
        newClassType = await prisma.classType.create({
          data: {
            name,
            notes,
            parentId,
            order: finalOrder,
            ...(color !== undefined ? { color } : ({} as any)),
          } as any,
          include: { parent: true, children: true },
        });
      } catch (e) {
        // Retry without color
        newClassType = await prisma.classType.create({
          data: { name, notes, parentId, order: finalOrder },
          include: { parent: true, children: true },
        });
      }

      // Format response
      const formattedClassType = formatClassType(newClassType);

      return NextResponse.json(
        {
          data: [formattedClassType],
          message: "授業タイプを作成しました",
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
        { error: "授業タイプの作成に失敗しました" }, // "Failed to create class type"
        { status: 500 }
      );
    }
  }
);
