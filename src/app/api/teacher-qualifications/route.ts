// src/app/api/teacher-qualifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  teacherQualificationCreateSchema,
  teacherQualificationFilterSchema,
  teacherQualificationBulkCreateSchema,
  teacherQualificationBatchVerifySchema,
} from "@/schemas/teacher-qualification.schema";
import { TeacherQualification } from "@prisma/client";

type FormattedTeacherQualification = {
  qualificationId: string;
  teacherId: string;
  teacherName: string;
  subjectOfferingId: string;
  subjectName: string;
  subjectTypeName: string;
  verified: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
  updatedAt: string;
};

// Helper function to format teacher qualification response
const formatTeacherQualification = (
  qualification: TeacherQualification & {
    teacher: { name: string };
    subjectOffering: {
      subject: {
        name: string;
        branchId: string | null;
        branch?: { name: string } | null;
      };
      subjectType: { name: string };
    };
  }
): FormattedTeacherQualification => ({
  qualificationId: qualification.qualificationId,
  teacherId: qualification.teacherId,
  teacherName: qualification.teacher.name,
  subjectOfferingId: qualification.subjectOfferingId,
  subjectName: qualification.subjectOffering.subject.name,
  subjectTypeName: qualification.subjectOffering.subjectType.name,
  verified: qualification.verified,
  notes: qualification.notes,
  branchId: qualification.subjectOffering.subject.branchId,
  branchName: qualification.subjectOffering.subject.branch?.name || null,
  createdAt: qualification.createdAt.toISOString(),
  updatedAt: qualification.updatedAt.toISOString(),
});

// GET - List teacher qualifications with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = teacherQualificationFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      teacherId,
      subjectOfferingId,
      subjectId,
      subjectTypeId,
      verified,
    } = result.data;

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // If a specific branchId is provided in the request, use that
    if (result.data.branchId) {
      where.subjectOffering = {
        subject: {
          branchId: result.data.branchId,
        },
      };
    }
    // Otherwise use the user's current branch unless they are an admin
    else if (session.user?.role !== "ADMIN") {
      where.subjectOffering = {
        subject: {
          branchId: branchId,
        },
      };
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (subjectOfferingId) {
      where.subjectOfferingId = subjectOfferingId;
    }

    if (subjectId) {
      where.subjectOffering = {
        ...where.subjectOffering,
        subjectId: subjectId,
      };
    }

    if (subjectTypeId) {
      where.subjectOffering = {
        ...where.subjectOffering,
        subjectTypeId: subjectTypeId,
      };
    }

    if (verified !== undefined) {
      where.verified = verified;
    }

    // For teachers, only show their own qualifications
    if (session.user?.role === "TEACHER") {
      // Get teacher record for the current user
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
      });

      if (teacher) {
        where.teacherId = teacher.teacherId;
      } else {
        // If teacher record not found, return empty results
        return NextResponse.json({
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
          },
        });
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.teacherQualification.count({ where });

    // Fetch teacher qualifications with related entities
    const qualifications = await prisma.teacherQualification.findMany({
      where,
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
        subjectOffering: {
          select: {
            subject: {
              select: {
                name: true,
                branchId: true,
                branch: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            subjectType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: [
        { teacher: { name: "asc" } },
        { subjectOffering: { subject: { name: "asc" } } },
        { subjectOffering: { subjectType: { name: "asc" } } },
      ],
    });

    // Format teacher qualifications
    const formattedQualifications = qualifications.map(
      formatTeacherQualification
    );

    return NextResponse.json({
      data: formattedQualifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create new teacher qualification(s) or handle batch operations
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Check if this is a batch verify request
      if (body.qualificationIds && Array.isArray(body.qualificationIds)) {
        // Handle batch verification
        const batchResult =
          teacherQualificationBatchVerifySchema.safeParse(body);
        if (!batchResult.success) {
          return NextResponse.json(
            { error: "入力データが無効です" },
            { status: 400 }
          );
        }

        const { qualificationIds, verified } = batchResult.data;

        // Verify all qualifications exist and user has access
        const qualifications = await prisma.teacherQualification.findMany({
          where: {
            qualificationId: { in: qualificationIds },
            ...(session.user?.role !== "ADMIN" && {
              subjectOffering: {
                subject: {
                  branchId: branchId,
                },
              },
            }),
          },
        });

        if (qualifications.length !== qualificationIds.length) {
          return NextResponse.json(
            { error: "一部の資格が見つからないか、アクセス権限がありません" },
            { status: 400 }
          );
        }

        // Update verification status
        await prisma.teacherQualification.updateMany({
          where: { qualificationId: { in: qualificationIds } },
          data: { verified },
        });

        return NextResponse.json(
          {
            data: [],
            message: `${qualificationIds.length}件の資格の認証状態を更新しました`,
            pagination: {
              total: qualificationIds.length,
              page: 1,
              limit: qualificationIds.length,
              pages: 1,
            },
          },
          { status: 200 }
        );
      }

      // Check if this is a bulk create request
      if (body.subjectOfferingIds && Array.isArray(body.subjectOfferingIds)) {
        // Handle bulk creation
        const bulkResult = teacherQualificationBulkCreateSchema.safeParse(body);
        if (!bulkResult.success) {
          return NextResponse.json(
            { error: "入力データが無効です" },
            { status: 400 }
          );
        }

        const { teacherId, subjectOfferingIds, verified, notes } =
          bulkResult.data;

        // Verify teacher exists
        const teacher = await prisma.teacher.findUnique({
          where: { teacherId },
        });

        if (!teacher) {
          return NextResponse.json(
            { error: "指定された教師が存在しません" },
            { status: 400 }
          );
        }

        // Verify all subject offerings exist and user has access
        const subjectOfferings = await prisma.subjectOffering.findMany({
          where: {
            subjectOfferingId: { in: subjectOfferingIds },
            ...(session.user?.role !== "ADMIN" && {
              subject: {
                branchId: branchId,
              },
            }),
          },
        });

        if (subjectOfferings.length !== subjectOfferingIds.length) {
          return NextResponse.json(
            { error: "一部の科目提供が存在しないか、アクセス権限がありません" },
            { status: 400 }
          );
        }

        // Check for existing qualifications
        const existingQualifications =
          await prisma.teacherQualification.findMany({
            where: {
              teacherId,
              subjectOfferingId: { in: subjectOfferingIds },
            },
          });

        if (existingQualifications.length > 0) {
          const existingOfferingIds = existingQualifications.map(
            (q) => q.subjectOfferingId
          );
          const conflictingOfferings = subjectOfferings.filter((so) =>
            existingOfferingIds.includes(so.subjectOfferingId)
          );

          return NextResponse.json(
            { error: `一部の科目提供は既に資格として登録されています` },
            { status: 409 }
          );
        }

        // Create multiple qualifications
        const createData = subjectOfferingIds.map((subjectOfferingId) => ({
          teacherId,
          subjectOfferingId,
          verified: verified ?? true, // Auto-verify since staff/admin is creating
          notes,
        }));

        const createdQualifications = await prisma.$transaction(
          createData.map((data) =>
            prisma.teacherQualification.create({
              data,
              include: {
                teacher: {
                  select: {
                    name: true,
                  },
                },
                subjectOffering: {
                  select: {
                    subject: {
                      select: {
                        name: true,
                        branchId: true,
                        branch: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                    subjectType: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            })
          )
        );

        const formattedQualifications = createdQualifications.map(
          formatTeacherQualification
        );

        return NextResponse.json(
          {
            data: formattedQualifications,
            message: `${formattedQualifications.length}件の教師資格を作成しました`,
            pagination: {
              total: formattedQualifications.length,
              page: 1,
              limit: formattedQualifications.length,
              pages: 1,
            },
          },
          { status: 201 }
        );
      } else {
        // Handle single creation
        const result = teacherQualificationCreateSchema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: "入力データが無効です" },
            { status: 400 }
          );
        }

        const { teacherId, subjectOfferingId, verified, notes } = result.data;

        // Verify teacher exists
        const teacher = await prisma.teacher.findUnique({
          where: { teacherId },
        });

        if (!teacher) {
          return NextResponse.json(
            { error: "指定された教師が存在しません" },
            { status: 400 }
          );
        }

        // Verify subject offering exists and user has access
        const subjectOffering = await prisma.subjectOffering.findUnique({
          where: { subjectOfferingId },
          include: {
            subject: {
              select: {
                branchId: true,
              },
            },
          },
        });

        if (!subjectOffering) {
          return NextResponse.json(
            { error: "指定された科目提供が存在しません" },
            { status: 400 }
          );
        }

        // Check branch access for non-admin users
        if (
          subjectOffering.subject.branchId &&
          subjectOffering.subject.branchId !== branchId &&
          session.user?.role !== "ADMIN"
        ) {
          return NextResponse.json(
            { error: "この科目提供にアクセスする権限がありません" },
            { status: 403 }
          );
        }

        // Check if qualification already exists
        const existingQualification =
          await prisma.teacherQualification.findFirst({
            where: { teacherId, subjectOfferingId },
          });

        if (existingQualification) {
          return NextResponse.json(
            {
              error:
                "この教師と科目提供の組み合わせは既に資格として登録されています",
            },
            { status: 409 }
          );
        }

        // Create teacher qualification
        const newQualification = await prisma.teacherQualification.create({
          data: {
            teacherId,
            subjectOfferingId,
            verified: verified ?? true, // Auto-verify since staff/admin is creating
            notes,
          },
          include: {
            teacher: {
              select: {
                name: true,
              },
            },
            subjectOffering: {
              select: {
                subject: {
                  select: {
                    name: true,
                    branchId: true,
                    branch: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                subjectType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        const formattedQualification =
          formatTeacherQualification(newQualification);

        return NextResponse.json(
          {
            data: [formattedQualification],
            message: "教師資格を作成しました",
            pagination: {
              total: 1,
              page: 1,
              limit: 1,
              pages: 1,
            },
          },
          { status: 201 }
        );
      }
    } catch (error) {
      console.error("Error creating teacher qualification:", error);
      return NextResponse.json(
        { error: "教師資格の作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);
