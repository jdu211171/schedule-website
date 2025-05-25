// src/app/api/subject-types/[subjectTypeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectTypeUpdateSchema } from "@/schemas/subject-type.schema";
import { SubjectType } from "@prisma/client";

type FormattedSubjectType = {
  subjectTypeId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subjectOfferings: number;
  };
};

// Helper function to format subject type response
const formatSubjectType = (
  subjectType: SubjectType & {
    _count?: {
      subjectOfferings: number;
    };
  }
): FormattedSubjectType => ({
  subjectTypeId: subjectType.subjectTypeId,
  name: subjectType.name,
  description: subjectType.description,
  createdAt: subjectType.createdAt.toISOString(),
  updatedAt: subjectType.updatedAt.toISOString(),
  _count: subjectType._count,
});

// GET a specific subject type by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session) => {
    const subjectTypeId = request.url.split("/").pop();

    if (!subjectTypeId) {
      return NextResponse.json(
        { error: "科目タイプIDが必要です" },
        { status: 400 }
      );
    }

    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
      include: {
        _count: {
          select: {
            subjectOfferings: true,
          },
        },
      },
    });

    if (!subjectType) {
      return NextResponse.json(
        { error: "科目タイプが見つかりません" },
        { status: 404 }
      );
    }

    // Format response
    const formattedSubjectType = formatSubjectType(subjectType);

    return NextResponse.json({
      data: formattedSubjectType,
    });
  }
);

// PATCH - Update a subject type
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      const subjectTypeId = request.url.split("/").pop();
      if (!subjectTypeId) {
        return NextResponse.json(
          { error: "科目タイプIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = subjectTypeUpdateSchema.safeParse({
        ...body,
        subjectTypeId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if subject type exists
      const existingSubjectType = await prisma.subjectType.findUnique({
        where: { subjectTypeId },
      });

      if (!existingSubjectType) {
        return NextResponse.json(
          { error: "科目タイプが見つかりません" },
          { status: 404 }
        );
      }

      const { name, description } = result.data;

      // Check if new name conflicts with existing subject type (if name is being changed)
      if (name && name !== existingSubjectType.name) {
        const conflictingSubjectType = await prisma.subjectType.findFirst({
          where: {
            name,
            subjectTypeId: { not: subjectTypeId },
          },
        });

        if (conflictingSubjectType) {
          return NextResponse.json(
            { error: "科目タイプ名は既に使用されています" },
            { status: 409 }
          );
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      // Update subject type
      const updatedSubjectType = await prisma.subjectType.update({
        where: { subjectTypeId },
        data: updateData,
        include: {
          _count: {
            select: {
              subjectOfferings: true,
            },
          },
        },
      });

      // Format response
      const formattedSubjectType = formatSubjectType(updatedSubjectType);

      return NextResponse.json({
        data: formattedSubjectType,
        message: "科目タイプを更新しました",
      });
    } catch (error) {
      console.error("Error updating subject type:", error);
      return NextResponse.json(
        { error: "科目タイプの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a subject type
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const subjectTypeId = request.url.split("/").pop();

    if (!subjectTypeId) {
      return NextResponse.json(
        { error: "科目タイプIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if subject type exists
      const subjectType = await prisma.subjectType.findUnique({
        where: { subjectTypeId },
        include: {
          _count: {
            select: {
              subjectOfferings: true,
            },
          },
        },
      });

      if (!subjectType) {
        return NextResponse.json(
          { error: "科目タイプが見つかりません" },
          { status: 404 }
        );
      }

      // Check if subject type is being used in any subject offerings
      if (subjectType._count.subjectOfferings > 0) {
        return NextResponse.json(
          {
            error: "この科目タイプは科目提供で使用されているため削除できません",
          },
          { status: 409 }
        );
      }

      // Delete the subject type
      await prisma.subjectType.delete({
        where: { subjectTypeId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "科目タイプを削除しました",
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
      console.error("Error deleting subject type:", error);
      return NextResponse.json(
        { error: "科目タイプの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
