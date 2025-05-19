// src/app/api/class-types/[classTypeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classTypeUpdateSchema } from "@/schemas/class-type.schema";
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

// GET a specific class type by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const classTypeId = request.url.split("/").pop();

    if (!classTypeId) {
      return NextResponse.json(
        { error: "クラスタイプIDが必要です" },
        { status: 400 }
      );
    }

    const classType = await prisma.classType.findUnique({
      where: { classTypeId },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!classType) {
      return NextResponse.json(
        { error: "クラスタイプが見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this class type's branch (non-admin users)
    if (
      classType.branchId &&
      classType.branchId !== branchId &&
      session.user?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "このクラスタイプにアクセスする権限がありません" },
        { status: 403 }
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
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
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

      // Check if user has access to this class type's branch (non-admin users)
      if (
        existingClassType.branchId &&
        existingClassType.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このクラスタイプにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const { name, notes } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingClassType.name) {
        const nameExists = await prisma.classType.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            branchId: existingClassType.branchId,
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

      // Update class type
      const updatedClassType = await prisma.classType.update({
        where: { classTypeId },
        data: {
          name,
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
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
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
        },
      });

      if (!classType) {
        return NextResponse.json(
          { error: "クラスタイプが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this class type's branch (non-admin users)
      if (
        classType.branchId &&
        classType.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このクラスタイプにアクセスする権限がありません" },
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
