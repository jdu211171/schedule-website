// src/app/api/teachers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  teacherCreateSchema,
  teacherFilterSchema,
} from "@/schemas/teacher.schema";
import { Teacher } from "@prisma/client";

type TeacherWithIncludes = Teacher & {
  user: {
    username: string | null;
    email: string | null;
    passwordHash?: string | null;
    branches?: {
      branch: {
        branchId: string;
        name: string;
      };
    }[];
    subjectPreferences?: {
      subjectId: string;
      subjectTypeId: string;
      subject: {
        subjectId: string;
        name: string;
      };
      subjectType: {
        subjectTypeId: string;
        name: string;
      };
    }[];
  };
};

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
  branches: {
    branchId: string;
    name: string;
  }[];
  subjectPreferences: {
    subjectId: string;
    subjectTypeIds: string[];
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format teacher response with proper typing
const formatTeacher = (teacher: TeacherWithIncludes): FormattedTeacher => {
  // Group subject preferences by subjectId
  const subjectPreferencesMap = new Map<string, string[]>();

  teacher.user.subjectPreferences?.forEach((pref) => {
    if (!subjectPreferencesMap.has(pref.subjectId)) {
      subjectPreferencesMap.set(pref.subjectId, []);
    }
    subjectPreferencesMap.get(pref.subjectId)!.push(pref.subjectTypeId);
  });

  const subjectPreferences = Array.from(subjectPreferencesMap.entries()).map(
    ([subjectId, subjectTypeIds]) => ({
      subjectId,
      subjectTypeIds,
    })
  );

  return {
    teacherId: teacher.teacherId,
    userId: teacher.userId,
    name: teacher.name,
    kanaName: teacher.kanaName,
    email: teacher.email,
    lineId: teacher.lineId,
    notes: teacher.notes,
    username: teacher.user.username,
    password: teacher.user.passwordHash || null,
    branches:
      teacher.user.branches?.map((ub) => ({
        branchId: ub.branch.branchId,
        name: ub.branch.name,
      })) || [],
    subjectPreferences,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
};

// GET - List teachers with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = teacherFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name } = result.data;

    // Build filter conditions
    const where: any = {};

    if (name) {
      where.OR = [
        { name: { contains: name, mode: "insensitive" } },
        { kanaName: { contains: name, mode: "insensitive" } },
      ];
    }

    // Filter teachers by branch for non-admin users
    if (session.user?.role !== "ADMIN") {
      where.user = {
        branches: {
          some: {
            branchId,
          },
        },
      };
    } else if (branchId) {
      // If admin has selected a specific branch, filter by that branch
      where.user = {
        branches: {
          some: {
            branchId,
          },
        },
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.teacher.count({ where });

    // Fetch teachers with branch associations
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
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
            subjectPreferences: {
              select: {
                subjectId: true,
                subjectTypeId: true,
                subject: {
                  select: {
                    subjectId: true,
                    name: true,
                  },
                },
                subjectType: {
                  select: {
                    subjectTypeId: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Format teachers using the helper function
    const formattedTeachers = teachers.map(formatTeacher);

    return NextResponse.json({
      data: formattedTeachers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new teacher
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = teacherCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const {
        username,
        password,
        email,
        branchIds = [],
        subjectPreferences = [],
        ...teacherData
      } = result.data;

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

      // For non-admin users, we'll ensure the teacher is associated with the selected branch
      const finalBranchIds = [...branchIds];
      if (!finalBranchIds.includes(branchId)) {
        finalBranchIds.push(branchId);
      }

      // Admins can assign teachers to any branch, but staff must include their selected branch
      if (session.user?.role !== "ADMIN") {
        // Staff can only assign teachers to branches they have access to
        const userBranches =
          session.user?.branches?.map((b) => b.branchId) || [];

        // Verify staff has access to all requested branches
        const unauthorizedBranches = finalBranchIds.filter(
          (id) => !userBranches.includes(id)
        );

        if (unauthorizedBranches.length > 0) {
          return NextResponse.json(
            {
              error:
                "You don't have access to assign teachers to some of these branches",
            },
            { status: 403 }
          );
        }
      }

      // Verify that all branchIds exist
      if (finalBranchIds.length > 0) {
        const branchCount = await prisma.branch.count({
          where: { branchId: { in: finalBranchIds } },
        });

        if (branchCount !== finalBranchIds.length) {
          return NextResponse.json(
            { error: "一部の支店IDが存在しません" }, // "Some branch IDs do not exist"
            { status: 400 }
          );
        }
      }

      // Validate subject preferences if provided
      if (subjectPreferences.length > 0) {
        // Check if all subjects exist
        const subjectIds = subjectPreferences.map((pref) => pref.subjectId);
        const subjectCount = await prisma.subject.count({
          where: { subjectId: { in: subjectIds } },
        });

        if (subjectCount !== subjectIds.length) {
          return NextResponse.json(
            { error: "一部の科目IDが存在しません" },
            { status: 400 }
          );
        }

        // Check if all subject types exist
        const subjectTypeIds = subjectPreferences.flatMap(
          (pref) => pref.subjectTypeIds
        );
        const uniqueSubjectTypeIds = [...new Set(subjectTypeIds)];
        const subjectTypeCount = await prisma.subjectType.count({
          where: { subjectTypeId: { in: uniqueSubjectTypeIds } },
        });

        if (subjectTypeCount !== uniqueSubjectTypeIds.length) {
          return NextResponse.json(
            { error: "一部の科目タイプIDが存在しません" },
            { status: 400 }
          );
        }
      }

      // For teachers, use the password directly (no hashing)
      const passwordHash = password;

      // Create user, teacher and branch associations in a transaction
      const newTeacher = await prisma.$transaction(async (tx) => {
        // Create user first
        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            email,
            role: "TEACHER",
          },
        });

        // Create teacher record
        const teacher = await tx.teacher.create({
          data: {
            ...teacherData,
            email,
            userId: user.id,
          },
        });

        // Create branch associations
        if (finalBranchIds.length > 0) {
          await tx.userBranch.createMany({
            data: finalBranchIds.map((branchId) => ({
              userId: user.id,
              branchId,
            })),
          });
        }

        // Create user subject preferences if provided
        if (subjectPreferences.length > 0) {
          const userSubjectPreferencesData = subjectPreferences.flatMap(
            (pref) =>
              pref.subjectTypeIds.map((subjectTypeId) => ({
                userId: user.id,
                subjectId: pref.subjectId,
                subjectTypeId,
              }))
          );

          await tx.userSubjectPreference.createMany({
            data: userSubjectPreferencesData,
          });
        }

        // Return teacher with user and branch associations
        return tx.teacher.findUnique({
          where: { teacherId: teacher.teacherId },
          include: {
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
                subjectPreferences: {
                  select: {
                    subjectId: true,
                    subjectTypeId: true,
                    subject: {
                      select: {
                        subjectId: true,
                        name: true,
                      },
                    },
                    subjectType: {
                      select: {
                        subjectTypeId: true,
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

      if (!newTeacher) {
        throw new Error("Failed to create teacher");
      }

      // Use the formatTeacher helper function
      const formattedTeacher = formatTeacher(newTeacher);

      return NextResponse.json(
        {
          data: [formattedTeacher],
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
      console.error("Error creating teacher:", error);
      return NextResponse.json(
        { error: "教師の作成に失敗しました" }, // "Failed to create teacher"
        { status: 500 }
      );
    }
  }
);
