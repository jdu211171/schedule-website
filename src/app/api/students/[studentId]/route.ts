// src/app/api/students/[studentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/schemas/student.schema";
import { Student, StudentType } from "@prisma/client";

// Define a type for the student with includes
type StudentWithIncludes = Student & {
  studentType: StudentType | null;
  user: {
    username: string | null;
    email: string | null;
    passwordHash: string | null;
    branches?: {
      branch: {
        branchId: string;
        name: string;
      };
    }[];
  };
};

// Define the return type for the formatted student
type FormattedStudent = {
  studentId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  studentTypeId: string | null;
  studentTypeName: string | null;
  maxYears: number | null;
  gradeYear: number | null;
  lineId: string | null;
  notes: string | null;
  username: string | null;
  email: string | null;
  password: string | null;
  branches: {
    branchId: string;
    name: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format student response with proper typing
const formatStudent = (student: StudentWithIncludes): FormattedStudent => ({
  studentId: student.studentId,
  userId: student.userId,
  name: student.name,
  kanaName: student.kanaName,
  studentTypeId: student.studentTypeId,
  studentTypeName: student.studentType?.name || null,
  maxYears: student.studentType?.maxYears || null,
  gradeYear: student.gradeYear,
  lineId: student.lineId,
  notes: student.notes,
  username: student.user.username,
  email: student.user.email,
  password: student.user.passwordHash,
  branches:
    student.user.branches?.map((ub) => ({
      branchId: ub.branch.branchId,
      name: ub.branch.name,
    })) || [],
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
});

// GET a specific student
export const GET = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const studentId = request.url.split("/").pop();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        studentType: true,
        user: {
          select: {
            username: true,
            email: true,
            passwordHash: true,
            branches: {
              include: {
                branch: {
                  select: {
                    branchId: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Format response using the helper function
    const formattedStudent = formatStudent(student);

    return NextResponse.json({
      data: [formattedStudent],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a student
export const PATCH = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      const studentId = request.url.split("/").pop();
      if (!studentId) {
        return NextResponse.json(
          { error: "Student ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = studentUpdateSchema.safeParse({ ...body, studentId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if student exists
      const existingStudent = await prisma.student.findUnique({
        where: { studentId },
        include: { user: true },
      });

      if (!existingStudent) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      const { username, password, email, branchIds, ...studentData } =
        result.data;

      // Check username uniqueness if being updated
      if (username && username !== existingStudent.user.username) {
        const userExists = await prisma.user.findFirst({
          where: { username, id: { not: existingStudent.userId } },
        });

        if (userExists) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
      }

      // Check email uniqueness if being updated
      if (email && email !== existingStudent.user.email) {
        const emailExists = await prisma.user.findFirst({
          where: { email, id: { not: existingStudent.userId } },
        });

        if (emailExists) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
      }

      // Verify that all branchIds exist if provided
      if (branchIds && branchIds.length > 0) {
        const branchCount = await prisma.branch.count({
          where: { branchId: { in: branchIds } },
        });

        if (branchCount !== branchIds.length) {
          return NextResponse.json(
            { error: "一部の支店IDが存在しません" }, // "Some branch IDs do not exist"
            { status: 400 }
          );
        }
      }

      // Update user, student and branch associations in a transaction
      const updatedStudent = await prisma.$transaction(async (tx) => {
        // Update user first if needed
        if (username || password || email) {
          await tx.user.update({
            where: { id: existingStudent.userId },
            data: {
              username,
              passwordHash: password || undefined,
              email,
            },
          });
        }

        // Update student record
        await tx.student.update({
          where: { studentId },
          data: studentData,
        });

        // Update branch associations if provided
        if (branchIds !== undefined) {
          // Delete existing branch associations
          await tx.userBranch.deleteMany({
            where: { userId: existingStudent.userId },
          });

          // Create new branch associations
          if (branchIds.length > 0) {
            await tx.userBranch.createMany({
              data: branchIds.map((branchId) => ({
                userId: existingStudent.userId,
                branchId,
              })),
            });
          }
        }

        // Return updated student with user and branch associations
        return tx.student.findUnique({
          where: { studentId },
          include: {
            studentType: true,
            user: {
              select: {
                username: true,
                email: true,
                passwordHash: true,
                branches: {
                  include: {
                    branch: {
                      select: {
                        branchId: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      if (!updatedStudent) {
        throw new Error("Failed to update student");
      }

      // Format response using the helper function
      const formattedStudent = formatStudent(updatedStudent);

      return NextResponse.json({
        data: [formattedStudent],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating student:", error);
      return NextResponse.json(
        { error: "Failed to update student" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a student
export const DELETE = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const studentId = request.url.split("/").pop();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { studentId },
        include: { user: true },
      });

      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      // Delete student, user and branch associations in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete branch associations first
        await tx.userBranch.deleteMany({
          where: { userId: student.userId },
        });

        // Delete student
        await tx.student.delete({ where: { studentId } });

        // Delete associated user
        await tx.user.delete({ where: { id: student.userId } });
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
      console.error("Error deleting student:", error);
      return NextResponse.json(
        { error: "Failed to delete student" },
        { status: 500 }
      );
    }
  }
);
