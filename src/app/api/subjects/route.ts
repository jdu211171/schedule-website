// src/app/api/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  subjectCreateSchema,
  subjectFilterSchema,
} from "@/schemas/subject.schema";
import { Subject } from "@prisma/client";

type FormattedSubject = {
  subjectId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format subject response
const formatSubject = (subject: Subject): FormattedSubject => ({
  subjectId: subject.subjectId,
  name: subject.name,
  notes: subject.notes,
  createdAt: subject.createdAt,
  updatedAt: subject.updatedAt,
});

// GET - List subjects with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = subjectFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name } = result.data;

    // Build filter conditions
    const where: { name?: { contains: string; mode: "insensitive" } } = {};

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.subject.count({ where });

    // Fetch subjects
    const subjects = await prisma.subject.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Format subjects
    const formattedSubjects = subjects.map(formatSubject);

    return NextResponse.json({
      data: formattedSubjects,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new subject
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = subjectCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { name, notes } = result.data;

      // Check if subject name already exists (globally)
      const existingSubject = await prisma.subject.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
        },
      });

      if (existingSubject) {
        return NextResponse.json(
          { error: "科目名は既に使用されています" }, // "Subject name already in use"
          { status: 409 }
        );
      }

      // Create subject
      const newSubject = await prisma.subject.create({
        data: {
          name,
          notes,
        },
      });

      // Format response
      const formattedSubject = formatSubject(newSubject);

      return NextResponse.json(
        {
          data: [formattedSubject],
          message: "科目を作成しました",
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
      console.error("Error creating subject:", error);
      return NextResponse.json(
        { error: "科目の作成に失敗しました" }, // "Failed to create subject"
        { status: 500 }
      );
    }
  }
);
