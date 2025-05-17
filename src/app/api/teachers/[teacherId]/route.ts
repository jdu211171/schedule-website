// src/app/api/teachers/[teacherId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherUpdateSchema } from "@/schemas/teacher.schema";
import { Teacher } from "@prisma/client";

// Define a type for the teacher with includes
type TeacherWithIncludes = Teacher & {
  user: {
    username: string | null;
    email: string | null;
    passwordHash: string | null;
  };
};

// Define the return type for the formatted teacher
type FormattedTeacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
  notes: string | null;
  username: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format teacher response with proper typing
const formatTeacher = (teacher: TeacherWithIncludes): FormattedTeacher => ({
  teacherId: teacher.teacherId,
  userId: teacher.userId,
  name: teacher.name,
  kanaName: teacher.kanaName,
  email: teacher.email,
  lineId: teacher.lineId,
  notes: teacher.notes,
  username: teacher.user.username,
  password: teacher.user.passwordHash,
  createdAt: teacher.createdAt,
  updatedAt: teacher.updatedAt,
});

// GET a specific teacher
export const GET = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const teacherId = request.url.split("/").pop();

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            passwordHash: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Format response using the helper function
    const formattedTeacher = formatTeacher(teacher);

    return NextResponse.json({
      data: [formattedTeacher],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a teacher
export const PATCH = withRole(["ADMIN", "STAFF"], async (request: NextRequest, session) => {
  try {
    const teacherId = request.url.split('/').pop();
    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    const body = await request.json();

    // Validate request body
    const result = teacherUpdateSchema.safeParse({ ...body, teacherId });
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherId },
      include: { user: true }
    });

    if (!existingTeacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const { username, password, email, ...teacherData } = result.data;

    // Check username uniqueness if being updated
    if (username && username !== existingTeacher.user.username) {
      const userExists = await prisma.user.findFirst({
        where: { username, id: { not: existingTeacher.userId } }
      });

      if (userExists) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    // Check email uniqueness if being updated
    if (email && email !== existingTeacher.user.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email, id: { not: existingTeacher.userId } }
      });

      if (emailExists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    // Update user and teacher in a transaction
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Update user first if needed
      if (username || password || email) {
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: {
            username,
            passwordHash: password || undefined,
            email
          }
        });
      }

      // Update teacher record - include email field in teacher data if provided
      return tx.teacher.update({
        where: { teacherId },
        data: {
          ...teacherData,
          ...(email && { email }) // Only add email field if it's provided
        },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              passwordHash: true
            }
          }
        }
      });
    });

    // Format response using the helper function
    const formattedTeacher = formatTeacher(updatedTeacher);

    return NextResponse.json({
      data: [formattedTeacher],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1
      }
    });
  } catch (error) {
    console.error("Error updating teacher:", error);
    return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 });
  }
});

// DELETE - Delete a teacher
export const DELETE = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const teacherId = request.url.split("/").pop();

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: { user: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }

      // Delete teacher and associated user in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete teacher first (due to foreign key constraints)
        await tx.teacher.delete({ where: { teacherId } });

        // Delete associated user
        await tx.user.delete({ where: { id: teacher.userId } });
      });

      return NextResponse.json(
        {
          data: [],
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
      console.error("Error deleting teacher:", error);
      return NextResponse.json(
        { error: "Failed to delete teacher" },
        { status: 500 }
      );
    }
  }
);
