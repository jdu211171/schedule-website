// src/app/api/subject-offerings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  subjectOfferingCreateSchema,
  subjectOfferingFilterSchema,
  subjectOfferingBulkCreateSchema,
} from "@/schemas/subject-offering.schema";
import { SubjectOffering } from "@prisma/client";

type FormattedSubjectOffering = {
  subjectOfferingId: string;
  subjectId: string;
  subjectName: string;
  subjectTypeId: string;
  subjectTypeName: string;
  isActive: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    teacherQualifications: number;
    studentSubjectPreferences: number;
  };
};

// Helper function to format subject offering response
const formatSubjectOffering = (
  subjectOffering: SubjectOffering & {
    subject: {
      name: string;
      branchId: string | null;
      branch?: { name: string } | null;
    };
    subjectType: { name: string };
    _count?: {
      teacherQualifications: number;
      studentSubjectPreferences: number;
    };
  }
): FormattedSubjectOffering => ({
  subjectOfferingId: subjectOffering.subjectOfferingId,
  subjectId: subjectOffering.subjectId,
  subjectName: subjectOffering.subject.name,
  subjectTypeId: subjectOffering.subjectTypeId,
  subjectTypeName: subjectOffering.subjectType.name,
  isActive: subjectOffering.isActive,
  notes: subjectOffering.notes,
  branchId: subjectOffering.subject.branchId,
  branchName: subjectOffering.subject.branch?.name || null,
  createdAt: subjectOffering.createdAt.toISOString(),
  updatedAt: subjectOffering.updatedAt.toISOString(),
  _count: subjectOffering._count,
});

// GET - List subject offerings with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = subjectOfferingFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, subjectId, subjectTypeId, isActive, search } =
      result.data;

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // If a specific branchId is provided in the request, use that
    if (result.data.branchId) {
      where.subject = {
        branchId: result.data.branchId,
      };
    }
    // Otherwise use the user's current branch unless they are an admin
    else if (session.user?.role !== "ADMIN") {
      where.subject = {
        branchId: branchId,
      };
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (subjectTypeId) {
      where.subjectTypeId = subjectTypeId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        {
          subject: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          subjectType: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.subjectOffering.count({ where });

    // Fetch subject offerings with related entities
    const subjectOfferings = await prisma.subjectOffering.findMany({
      where,
      include: {
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
        _count: {
          select: {
            teacherQualifications: true,
            studentSubjectPreferences: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: [{ subject: { name: "asc" } }, { subjectType: { name: "asc" } }],
    });

    // Format subject offerings
    const formattedSubjectOfferings = subjectOfferings.map(
      formatSubjectOffering
    );

    return NextResponse.json({
      data: formattedSubjectOfferings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new subject offering or bulk create multiple offerings
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Check if this is a bulk create request
      if (body.subjectTypeIds && Array.isArray(body.subjectTypeIds)) {
        // Handle bulk creation
        const bulkResult = subjectOfferingBulkCreateSchema.safeParse(body);
        if (!bulkResult.success) {
          return NextResponse.json(
            { error: "入力データが無効です" },
            { status: 400 }
          );
        }

        const { subjectId, subjectTypeIds, notes } =
          bulkResult.data;

        // Verify subject exists and user has access
        const subject = await prisma.subject.findUnique({
          where: { subjectId },
          include: { branch: true },
        });

        if (!subject) {
          return NextResponse.json(
            { error: "指定された科目が存在しません" },
            { status: 400 }
          );
        }

        // Check branch access for non-admin users
        if (
          subject.branchId &&
          subject.branchId !== branchId &&
          session.user?.role !== "ADMIN"
        ) {
          return NextResponse.json(
            { error: "この科目にアクセスする権限がありません" },
            { status: 403 }
          );
        }

        // Verify all subject types exist
        const subjectTypes = await prisma.subjectType.findMany({
          where: { subjectTypeId: { in: subjectTypeIds } },
        });

        if (subjectTypes.length !== subjectTypeIds.length) {
          return NextResponse.json(
            { error: "一部の科目タイプが存在しません" },
            { status: 400 }
          );
        }

        // Check for existing combinations
        const existingOfferings = await prisma.subjectOffering.findMany({
          where: {
            subjectId,
            subjectTypeId: { in: subjectTypeIds },
          },
        });

        if (existingOfferings.length > 0) {
          const existingTypes = existingOfferings
            .map(
              (o) =>
                subjectTypes.find((t) => t.subjectTypeId === o.subjectTypeId)
                  ?.name
            )
            .filter(Boolean);

          return NextResponse.json(
            {
              error: `以下の組み合わせは既に存在します: ${existingTypes.join(
                ", "
              )}`,
            },
            { status: 409 }
          );
        }

        // Create multiple offerings
        const createData = subjectTypeIds.map((subjectTypeId, index) => ({
          subjectId,
          subjectTypeId,
          notes,
        }));

        const createdOfferings = await prisma.$transaction(
          createData.map((data) =>
            prisma.subjectOffering.create({
              data,
              include: {
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
                _count: {
                  select: {
                    teacherQualifications: true,
                    studentSubjectPreferences: true,
                  },
                },
              },
            })
          )
        );

        const formattedOfferings = createdOfferings.map(formatSubjectOffering);

        return NextResponse.json(
          {
            data: formattedOfferings,
            message: `${formattedOfferings.length}件の科目提供を作成しました`,
            pagination: {
              total: formattedOfferings.length,
              page: 1,
              limit: formattedOfferings.length,
              pages: 1,
            },
          },
          { status: 201 }
        );
      } else {
        // Handle single creation
        const result = subjectOfferingCreateSchema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: "入力データが無効です" },
            { status: 400 }
          );
        }

        const { subjectId, subjectTypeId, isActive, notes } =
          result.data;

        // Verify subject exists and user has access
        const subject = await prisma.subject.findUnique({
          where: { subjectId },
          include: { branch: true },
        });

        if (!subject) {
          return NextResponse.json(
            { error: "指定された科目が存在しません" },
            { status: 400 }
          );
        }

        // Check branch access for non-admin users
        if (
          subject.branchId &&
          subject.branchId !== branchId &&
          session.user?.role !== "ADMIN"
        ) {
          return NextResponse.json(
            { error: "この科目にアクセスする権限がありません" },
            { status: 403 }
          );
        }

        // Verify subject type exists
        const subjectType = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });

        if (!subjectType) {
          return NextResponse.json(
            { error: "指定された科目タイプが存在しません" },
            { status: 400 }
          );
        }

        // Check if offering already exists
        const existingOffering = await prisma.subjectOffering.findFirst({
          where: { subjectId, subjectTypeId },
        });

        if (existingOffering) {
          return NextResponse.json(
            { error: "この科目と科目タイプの組み合わせは既に存在します" },
            { status: 409 }
          );
        }

        // Create subject offering
        const newSubjectOffering = await prisma.subjectOffering.create({
          data: {
            subjectId,
            subjectTypeId,
            isActive,
            notes,
          },
          include: {
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
            _count: {
              select: {
                teacherQualifications: true,
                studentSubjectPreferences: true,
              },
            },
          },
        });

        const formattedSubjectOffering =
          formatSubjectOffering(newSubjectOffering);

        return NextResponse.json(
          {
            data: [formattedSubjectOffering],
            message: "科目提供を作成しました",
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
      console.error("Error creating subject offering:", error);
      return NextResponse.json(
        { error: "科目提供の作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);
