// src/app/api/class-types/[classTypeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classTypeUpdateSchema } from "@/schemas/class-type.schema";
import { ClassType } from "@prisma/client";

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
  parent?: FormattedClassType | null;
  children?: FormattedClassType[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to check if a class type is protected (root level types)
const isProtectedClassType = (classType: { name: string; parentId: string | null }): boolean => {
  // Protected class types are root level types (no parent) with specific names
  return !classType.parentId && (classType.name === "通常授業" || classType.name === "特別授業");
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

// GET a specific class type by ID
export const GET = withRole(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session) => {
    const classTypeId = request.url.split("/").pop();

    if (!classTypeId) {
      return NextResponse.json(
        { error: "クラスタイプIDが必要です" },
        { status: 400 }
      );
    }

    // Parse query parameters for includes
    const url = new URL(request.url);
    const includeChildren = url.searchParams.get("includeChildren") === "true";
    const includeParent = url.searchParams.get("includeParent") === "true";

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

    const classType = await prisma.classType.findUnique({
      where: { classTypeId },
      include,
    });

    if (!classType) {
      return NextResponse.json(
        { error: "クラスタイプが見つかりません" },
        { status: 404 }
      );
    }

    // Format response
    const formattedClassType = formatClassType(classType);

    return NextResponse.json({
      data: [formattedClassType],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a class type
export const PATCH = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      const classTypeId = request.url.split("/").pop();
      if (!classTypeId) {
        return NextResponse.json(
          { error: "クラスタイプIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = classTypeUpdateSchema.safeParse({ ...body, classTypeId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if class type exists
      const existingClassType = await prisma.classType.findUnique({
        where: { classTypeId },
      });

      if (!existingClassType) {
        return NextResponse.json(
          { error: "クラスタイプが見つかりません" },
          { status: 404 }
        );
      }

      // Check if this is a protected class type (通常授業 or 特別授業)
      if (isProtectedClassType(existingClassType)) {
        return NextResponse.json(
          { error: "この基本クラスタイプは編集できません" },
          { status: 403 }
        );
      }

      const { name, notes, parentId, order } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingClassType.name) {
        const nameExists = await prisma.classType.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            classTypeId: { not: classTypeId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "このクラスタイプ名はすでに使用されています" },
            { status: 409 }
          );
        }
      }

      // If parentId is being updated, validate hierarchy
      if (parentId !== undefined && parentId !== existingClassType.parentId) {
        if (parentId) {
          // Check if parent exists
          const parentExists = await prisma.classType.findUnique({
            where: { classTypeId: parentId },
          });

          if (!parentExists) {
            return NextResponse.json(
              { error: "指定された親クラスタイプが見つかりません" },
              { status: 400 }
            );
          }

          // Validate hierarchy to prevent cycles
          const isValidHierarchy = await validateHierarchy(
            classTypeId,
            parentId
          );
          if (!isValidHierarchy) {
            return NextResponse.json(
              {
                error:
                  "階層構造が循環参照になるため、この親クラスタイプを設定できません",
              },
              { status: 400 }
            );
          }
        }
      }

      // Update class type
      const updatedClassType = await prisma.classType.update({
        where: { classTypeId },
        data: {
          name,
          notes,
          parentId,
          order,
        },
        include: {
          parent: true,
          children: {
            orderBy: { name: "asc" },
          },
        },
      });

      // Format response
      const formattedClassType = formatClassType(updatedClassType);

      return NextResponse.json({
        data: [formattedClassType],
        message: "クラスタイプを更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating class type:", error);
      return NextResponse.json(
        { error: "クラスタイプの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a class type
export const DELETE = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const classTypeId = request.url.split("/").pop();

    if (!classTypeId) {
      return NextResponse.json(
        { error: "クラスタイプIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if class type exists
      const classType = await prisma.classType.findUnique({
        where: { classTypeId },
        include: {
          classSessions: { take: 1 }, // Check if there are any associated class sessions
          children: { take: 1 }, // Check if there are any child class types
        },
      });

      if (!classType) {
        return NextResponse.json(
          { error: "クラスタイプが見つかりません" },
          { status: 404 }
        );
      }

      // Check if this is a protected class type (通常授業 or 特別授業)
      if (isProtectedClassType(classType)) {
        return NextResponse.json(
          { error: "この基本クラスタイプは削除できません" },
          { status: 403 }
        );
      }

      // Prevent deletion if class type has associated class sessions
      if (classType.classSessions.length > 0) {
        return NextResponse.json(
          {
            error:
              "関連するクラスセッションがあるため、このクラスタイプを削除できません",
          },
          { status: 400 }
        );
      }

      // Prevent deletion if class type has children
      if (classType.children.length > 0) {
        return NextResponse.json(
          {
            error:
              "サブクラスタイプが存在するため、このクラスタイプを削除できません。先にサブクラスタイプを削除してください。",
          },
          { status: 400 }
        );
      }

      // Delete the class type
      await prisma.classType.delete({
        where: { classTypeId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "クラスタイプを削除しました",
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
      console.error("Error deleting class type:", error);
      return NextResponse.json(
        { error: "クラスタイプの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
