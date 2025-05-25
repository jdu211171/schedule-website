// src/app/api/subject-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  subjectTypeCreateSchema,
  subjectTypeFilterSchema,
} from "@/schemas/subject-type.schema";
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

// GET - List subject types with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = subjectTypeFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name } = result.data;

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.subjectType.count({ where });

    // Fetch subject types with offering count
    const subjectTypes = await prisma.subjectType.findMany({
      where,
      include: {
        _count: {
          select: {
            subjectOfferings: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Format subject types
    const formattedSubjectTypes = subjectTypes.map(formatSubjectType);

    return NextResponse.json({
      data: formattedSubjectTypes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new subject type
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = subjectTypeCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, description } = result.data;

      // Check if subject type name already exists
      const existingSubjectType = await prisma.subjectType.findFirst({
        where: { name },
      });

      if (existingSubjectType) {
        return NextResponse.json(
          { error: "科目タイプ名は既に使用されています" }, // "Subject type name already in use"
          { status: 409 }
        );
      }

      // Create subject type
      const newSubjectType = await prisma.subjectType.create({
        data: {
          name,
          description,
        },
        include: {
          _count: {
            select: {
              subjectOfferings: true,
            },
          },
        },
      });

      const formattedSubjectType = formatSubjectType(newSubjectType);

      return NextResponse.json(
        {
          data: [formattedSubjectType],
          message: "科目タイプを作成しました",
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
      console.error("Error creating subject type:", error);
      return NextResponse.json(
        { error: "科目タイプの作成に失敗しました" }, // "Failed to create subject type"
        { status: 500 }
      );
    }
  }
);
