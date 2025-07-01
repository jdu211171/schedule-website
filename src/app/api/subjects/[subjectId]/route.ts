// src/app/api/subjects/[subjectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectUpdateSchema } from "@/schemas/subject.schema";
import { Subject } from "@prisma/client";
import { handlePrismaError } from "@/lib/prisma-error-handler";

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

// GET a specific subject by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    const subjectId = request.url.split("/").pop();

    if (!subjectId) {
      return NextResponse.json({ error: "科目IDが必要です" }, { status: 400 });
    }

    const subject = await prisma.subject.findUnique({
      where: { subjectId },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "科目が見つかりません" },
        { status: 404 }
      );
    }

    // Format response
    const formattedSubject = formatSubject(subject);

    return NextResponse.json({
      data: [formattedSubject],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a subject
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const subjectId = request.url.split("/").pop();
      if (!subjectId) {
        return NextResponse.json(
          { error: "科目IDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = subjectUpdateSchema.safeParse({ ...body, subjectId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if subject exists
      const existingSubject = await prisma.subject.findUnique({
        where: { subjectId },
      });

      if (!existingSubject) {
        return NextResponse.json(
          { error: "科目が見つかりません" },
          { status: 404 }
        );
      }

      const { name, notes } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingSubject.name) {
        const nameExists = await prisma.subject.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            subjectId: { not: subjectId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "この科目名はすでに使用されています" },
            { status: 409 }
          );
        }
      }

      // Update subject
      const updatedSubject = await prisma.subject.update({
        where: { subjectId },
        data: {
          name,
          notes,
        },
      });

      // Format response
      const formattedSubject = formatSubject(updatedSubject);

      return NextResponse.json({
        data: [formattedSubject],
        message: "科目を更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating subject:", error);
      return NextResponse.json(
        { error: "科目の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a subject
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    const subjectId = request.url.split("/").pop();

    if (!subjectId) {
      return NextResponse.json({ error: "科目IDが必要です" }, { status: 400 });
    }

    try {
      // Delete the subject - let Prisma handle foreign key constraints
      await prisma.subject.delete({
        where: { subjectId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "科目を削除しました",
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
      const errorResponse = handlePrismaError(error, { entity: 'subject', operation: 'delete' });
      return NextResponse.json(
        { error: errorResponse.error },
        { status: errorResponse.status }
      );
    }
  }
);
