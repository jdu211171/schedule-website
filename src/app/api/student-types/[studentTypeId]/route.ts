// src/app/api/student-types/[studentTypeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentTypeUpdateSchema } from "@/schemas/student-type.schema";
import { StudentType } from "@prisma/client";

type FormattedStudentType = {
  studentTypeId: string;
  name: string;
  maxYears: number | null;
  description: string | null;
  order: number | null;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format studentType response
const formatStudentType = async (
  studentType: StudentType
): Promise<FormattedStudentType> => {
  // Get count of students with this type
  const studentCount = await prisma.student.count({
    where: { studentTypeId: studentType.studentTypeId },
  });

  return {
    studentTypeId: studentType.studentTypeId,
    name: studentType.name,
    maxYears: studentType.maxYears,
    description: studentType.description,
    order: studentType.order,
    studentCount,
    createdAt: studentType.createdAt,
    updatedAt: studentType.updatedAt,
  };
};

// GET a specific student type by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session) => {
    const studentTypeId = request.url.split("/").pop();

    if (!studentTypeId) {
      return NextResponse.json(
        { error: "生徒タイプIDが必要です" },
        { status: 400 }
      );
    }

    const studentType = await prisma.studentType.findUnique({
      where: { studentTypeId },
    });

    if (!studentType) {
      return NextResponse.json(
        { error: "生徒タイプが見つかりません" },
        { status: 404 }
      );
    }

    // Format response
    const formattedStudentType = await formatStudentType(studentType);

    return NextResponse.json({
      data: [formattedStudentType],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a student type
export const PATCH = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    try {
      const studentTypeId = request.url.split("/").pop();
      if (!studentTypeId) {
        return NextResponse.json(
          { error: "生徒タイプIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = studentTypeUpdateSchema.safeParse({
        ...body,
        studentTypeId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if student type exists
      const existingStudentType = await prisma.studentType.findUnique({
        where: { studentTypeId },
      });

      if (!existingStudentType) {
        return NextResponse.json(
          { error: "生徒タイプが見つかりません" },
          { status: 404 }
        );
      }

      const { name, maxYears, description, order } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingStudentType.name) {
        const nameExists = await prisma.studentType.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            studentTypeId: { not: studentTypeId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "この生徒タイプ名は既に使用されています" },
            { status: 409 }
          );
        }
      }

      // Update student type
      const updatedStudentType = await prisma.studentType.update({
        where: { studentTypeId },
        data: {
          name,
          maxYears,
          description,
          order,
        },
      });

      // Format response
      const formattedStudentType = await formatStudentType(updatedStudentType);

      return NextResponse.json({
        data: [formattedStudentType],
        message: "生徒タイプを更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating student type:", error);
      return NextResponse.json(
        { error: "生徒タイプの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a student type
export const DELETE = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    const studentTypeId = request.url.split("/").pop();

    if (!studentTypeId) {
      return NextResponse.json(
        { error: "生徒タイプIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if student type exists
      const studentType = await prisma.studentType.findUnique({
        where: { studentTypeId },
      });

      if (!studentType) {
        return NextResponse.json(
          { error: "生徒タイプが見つかりません" },
          { status: 404 }
        );
      }

      // Check if there are students using this type
      const studentCount = await prisma.student.count({
        where: { studentTypeId },
      });

      if (studentCount > 0) {
        return NextResponse.json(
          {
            error: "このタイプを使用している生徒がいるため削除できません",
            studentCount,
          },
          { status: 400 }
        );
      }

      // Delete the student type
      await prisma.studentType.delete({
        where: { studentTypeId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "生徒タイプを削除しました",
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
      console.error("Error deleting student type:", error);
      return NextResponse.json(
        { error: "生徒タイプの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
