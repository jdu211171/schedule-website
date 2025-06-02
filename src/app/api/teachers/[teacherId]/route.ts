// src/app/api/teachers/[teacherId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherUpdateSchema } from "@/schemas/teacher.schema";
import { Teacher } from "@prisma/client";

// Define a type for the teacher with includes
type TeacherWithIncludes = Teacher & {
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

// Define the return type for the formatted teacher
type FormattedTeacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
  notes: string | null;
  status: string;
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
    status: teacher.status,
    username: teacher.user.username,
    password: teacher.user.passwordHash,
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

// GET a specific teacher
export const GET = withBranchAccess(
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
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      const teacherId = request.url.split("/").pop();
      if (!teacherId) {
        return NextResponse.json(
          { error: "Teacher ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = teacherUpdateSchema.safeParse({ ...body, teacherId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if teacher exists
      const existingTeacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: { user: true },
      });

      if (!existingTeacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }

      const {
        username,
        password,
        email,
        branchIds,
        subjectPreferences,
        ...teacherData
      } = result.data;

      // Check username uniqueness if being updated
      if (username && username !== existingTeacher.user.username) {
        const userExists = await prisma.user.findFirst({
          where: { username, id: { not: existingTeacher.userId } },
        });

        if (userExists) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
      }

      // Check email uniqueness if being updated
      if (email && email !== existingTeacher.user.email) {
        const emailExists = await prisma.user.findFirst({
          where: { email, id: { not: existingTeacher.userId } },
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

      // Validate subject preferences if provided
      if (subjectPreferences && subjectPreferences.length > 0) {
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

      // Update user, teacher and branch associations in a transaction
      const updatedTeacher = await prisma.$transaction(async (tx) => {
        // Update user first if needed
        if (username || password || email) {
          await tx.user.update({
            where: { id: existingTeacher.userId },
            data: {
              username,
              passwordHash: password || undefined,
              email,
            },
          });
        }

        // Update teacher record - include email field in teacher data if provided
        await tx.teacher.update({
          where: { teacherId },
          data: {
            ...teacherData,
            ...(email && { email }), // Only add email field if it's provided
          },
        });

        // Update branch associations if provided
        if (branchIds !== undefined) {
          // Delete existing branch associations
          await tx.userBranch.deleteMany({
            where: { userId: existingTeacher.userId },
          });

          // Create new branch associations
          if (branchIds.length > 0) {
            await tx.userBranch.createMany({
              data: branchIds.map((branchId) => ({
                userId: existingTeacher.userId,
                branchId,
              })),
            });
          }
        }

        // Update user subject preferences if provided
        if (subjectPreferences !== undefined) {
          // Delete existing subject preferences
          await tx.userSubjectPreference.deleteMany({
            where: { userId: existingTeacher.userId },
          });

          // Create new subject preferences
          if (subjectPreferences.length > 0) {
            const userSubjectPreferencesData = subjectPreferences.flatMap(
              (pref) =>
                pref.subjectTypeIds.map((subjectTypeId) => ({
                  userId: existingTeacher.userId,
                  subjectId: pref.subjectId,
                  subjectTypeId,
                }))
            );

            await tx.userSubjectPreference.createMany({
              data: userSubjectPreferencesData,
            });
          }
        }

        // Return updated teacher with user and branch associations
        return tx.teacher.findUnique({
          where: { teacherId },
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

      if (!updatedTeacher) {
        throw new Error("Failed to update teacher");
      }

      // Format response using the helper function
      const formattedTeacher = formatTeacher(updatedTeacher);

      return NextResponse.json({
        data: [formattedTeacher],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating teacher:", error);
      return NextResponse.json(
        { error: "Failed to update teacher" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a teacher
export const DELETE = withBranchAccess(
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

      // Delete teacher, user and branch associations in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete subject preferences first
        await tx.userSubjectPreference.deleteMany({
          where: { userId: teacher.userId },
        });

        // Delete branch associations
        await tx.userBranch.deleteMany({
          where: { userId: teacher.userId },
        });

        // Delete teacher
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
