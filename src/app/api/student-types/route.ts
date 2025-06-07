// src/app/api/student-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  studentTypeCreateSchema,
  studentTypeFilterSchema,
} from "@/schemas/student-type.schema";
import { StudentType, Prisma } from "@prisma/client";

type FormattedStudentType = {
  studentTypeId: string;
  name: string;
  maxYears: number | null;
  description: string | null;
  order: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format student type response
const formatStudentType = (studentType: StudentType): FormattedStudentType => ({
  studentTypeId: studentType.studentTypeId,
  name: studentType.name,
  maxYears: studentType.maxYears,
  description: studentType.description,
  order: studentType.order,
  createdAt: studentType.createdAt,
  updatedAt: studentType.updatedAt,
});

// GET - List student types with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = studentTypeFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name } = result.data;

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    // ALWAYS sort by order field to maintain admin-defined sequence
    const orderBy: Prisma.StudentTypeOrderByWithRelationInput[] = [
      { order: { sort: "asc", nulls: "last" } },
      { name: "asc" }, // Secondary sort by name for student types with same order
    ];

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.studentType.count({ where });

    // Fetch student types
    const studentTypes = await prisma.studentType.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    // Format student types
    const formattedStudentTypes = studentTypes.map(formatStudentType);

    return NextResponse.json({
      data: formattedStudentTypes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new student type
export const POST = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = studentTypeCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, maxYears, description, order } = result.data;

      // Check if student type name already exists
      const existingStudentType = await prisma.studentType.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });

      if (existingStudentType) {
        return NextResponse.json(
          { error: "この学生タイプ名は既に使用されています" }, // "Student type name already in use"
          { status: 409 }
        );
      }

      // Determine the order value
      let finalOrder = order;
      if (!finalOrder) {
        // Get the current maximum order value
        const maxOrderResult = await prisma.studentType.aggregate({
          _max: {
            order: true,
          },
        });
        finalOrder = maxOrderResult._max.order
          ? maxOrderResult._max.order + 1
          : 1;
      }

      // Create student type
      const newStudentType = await prisma.studentType.create({
        data: {
          name,
          maxYears,
          description,
          order: finalOrder,
        },
      });

      // Format response
      const formattedStudentType = formatStudentType(newStudentType);

      return NextResponse.json(
        {
          data: [formattedStudentType],
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
      console.error("Error creating student type:", error);
      return NextResponse.json(
        { error: "学生タイプの作成に失敗しました" }, // "Failed to create student type"
        { status: 500 }
      );
    }
  }
);
