// src/app/api/subject-types/[subjectTypeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectTypeUpdateSchema } from "@/schemas/subject-type.schema";
import { SubjectType } from "@prisma/client";

type FormattedSubjectType = {
  subjectTypeId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format subject type response
const formatSubjectType = (subjectType: SubjectType): FormattedSubjectType => ({
  subjectTypeId: subjectType.subjectTypeId,
  name: subjectType.name,
  notes: subjectType.notes,
  createdAt: subjectType.createdAt,
  updatedAt: subjectType.updatedAt,
});

// GET a specific subject type by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    const subjectTypeId = request.url.split("/").pop();

    if (!subjectTypeId) {
      return NextResponse.json(
        { error: "科目タイプIDが必要です" },
        { status: 400 }
      );
    }

    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
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
      data: [formattedSubjectType],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a subject type
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
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

      const { name, notes } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingSubjectType.name) {
        const nameExists = await prisma.subjectType.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            subjectTypeId: { not: subjectTypeId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "この科目タイプ名はすでに使用されています" },
            { status: 409 }
          );
        }
      }

      // Update subject type
      const updatedSubjectType = await prisma.subjectType.update({
        where: { subjectTypeId },
        data: {
          name,
          notes,
        },
      });

      // Format response
      const formattedSubjectType = formatSubjectType(updatedSubjectType);

      return NextResponse.json({
        data: [formattedSubjectType],
        message: "科目タイプを更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
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
  async (request: NextRequest) => {
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
          preferences: { take: 1 }, // Check if there are any associated preferences
        },
      });

      if (!subjectType) {
        return NextResponse.json(
          { error: "科目タイプが見つかりません" },
          { status: 404 }
        );
      }

      // Prevent deletion if subject type has associated preferences
      if (subjectType.preferences.length > 0) {
        return NextResponse.json(
          {
            error:
              "関連するユーザー設定があるため、この科目タイプを削除できません",
          },
          { status: 400 }
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
