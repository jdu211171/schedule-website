// src/app/api/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  studentCreateSchema,
  studentFilterSchema,
} from "@/schemas/student.schema";
import { Student, StudentType } from "@prisma/client";

type StudentWithIncludes = Student & {
  studentType: StudentType | null;
  user: {
    username: string | null;
    email: string | null;
    passwordHash?: string | null;
  };
};

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
  password: student.user.passwordHash || null,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
});

// GET - List students with pagination and filters
export const GET = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = studentFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name, studentTypeId, gradeYear } = result.data;

    // Build filter conditions
    const where: any = {};

    if (name) {
      where.OR = [
        { name: { contains: name, mode: "insensitive" } },
        { kanaName: { contains: name, mode: "insensitive" } },
      ];
    }

    if (studentTypeId) {
      where.studentTypeId = studentTypeId;
    }

    if (gradeYear !== undefined) {
      where.gradeYear = gradeYear;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.student.count({ where });

    // Fetch students
    const students = await prisma.student.findMany({
      where,
      include: {
        studentType: {
          select: {
            studentTypeId: true,
            name: true,
            maxYears: true,
          },
        },
        user: {
          select: {
            username: true,
            email: true,
            passwordHash: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Prepare response data with a flatter structure
    const formattedStudents = students.map((student) => ({
      studentId: student.studentId,
      userId: student.userId,
      name: student.name,
      kanaName: student.kanaName,
      studentTypeId: student.studentTypeId,
      studentTypeName: student.studentType?.name,
      maxYears: student.studentType?.maxYears,
      gradeYear: student.gradeYear,
      lineId: student.lineId,
      notes: student.notes,
      username: student.user.username,
      email: student.user.email,
      password: student.user.passwordHash,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }));

    return NextResponse.json({
      data: formattedStudents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new student
export const POST = withRole(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = studentCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { username, password, email, studentTypeId, ...studentData } =
        result.data;

      // Check if username already exists
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email: email || undefined }] },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error:
              email && existingUser.email === email
                ? "メールアドレスは既に使用されています" // "Email already in use"
                : "ユーザー名は既に使用されています", // "Username already taken"
          },
          { status: 409 }
        );
      }

      // If studentTypeId is provided, check if it exists
      if (studentTypeId) {
        const studentType = await prisma.studentType.findUnique({
          where: { studentTypeId },
        });

        if (!studentType) {
          return NextResponse.json(
            { error: "指定された学生タイプが存在しません" }, // "Specified student type does not exist"
            { status: 400 }
          );
        }
      }

      // For students, use the password directly (no hashing)
      const passwordHash = password;

      // Create user and student in a transaction
      const newStudent = await prisma.$transaction(async (tx) => {
        // Create user first
        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            email,
            role: "STUDENT",
          },
        });

        // Create student record
        const student = await tx.student.create({
          data: {
            ...studentData,
            studentTypeId,
            userId: user.id,
          },
          include: {
            studentType: true,
            user: {
              select: {
                username: true,
                email: true,
                passwordHash: true,
              },
            },
          },
        });

        return student;
      });

      // Use the formatStudent helper function
      const formattedStudent = formatStudent(newStudent);

      return NextResponse.json(
        {
          data: [formattedStudent],
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
      console.error("Error creating student:", error);
      return NextResponse.json(
        { error: "生徒の作成に失敗しました" }, // "Failed to create student"
        { status: 500 }
      );
    }
  }
);
