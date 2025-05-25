// src/app/api/subject-offerings/[subjectOfferingId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectOfferingUpdateSchema } from "@/schemas/subject-offering.schema";
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

// GET a specific subject offering by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"],
  async (request: NextRequest, session, branchId) => {
    const subjectOfferingId = request.url.split("/").pop();

    if (!subjectOfferingId) {
      return NextResponse.json(
        { error: "科目提供IDが必要です" },
        { status: 400 }
      );
    }

    const subjectOffering = await prisma.subjectOffering.findUnique({
      where: { subjectOfferingId },
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

    if (!subjectOffering) {
      return NextResponse.json(
        { error: "科目提供が見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this subject offering's branch (non-admin users)
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

    // Format response
    const formattedSubjectOffering = formatSubjectOffering(subjectOffering);

    return NextResponse.json({
      data: formattedSubjectOffering,
    });
  }
);

// PATCH - Update a subject offering
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const subjectOfferingId = request.url.split("/").pop();
      if (!subjectOfferingId) {
        return NextResponse.json(
          { error: "科目提供IDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = subjectOfferingUpdateSchema.safeParse({
        ...body,
        subjectOfferingId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if subject offering exists
      const existingSubjectOffering = await prisma.subjectOffering.findUnique({
        where: { subjectOfferingId },
        include: {
          subject: {
            select: {
              branchId: true,
            },
          },
        },
      });

      if (!existingSubjectOffering) {
        return NextResponse.json(
          { error: "科目提供が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this subject offering's branch (non-admin users)
      if (
        existingSubjectOffering.subject.branchId &&
        existingSubjectOffering.subject.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この科目提供にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const { subjectId, subjectTypeId, isActive, notes } =
        result.data;

      // Prepare update data
      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (notes !== undefined) updateData.notes = notes;

      // Handle subject or subject type changes
      if (subjectId || subjectTypeId) {
        const newSubjectId = subjectId || existingSubjectOffering.subjectId;
        const newSubjectTypeId =
          subjectTypeId || existingSubjectOffering.subjectTypeId;

        // Check if new combination already exists (if it's different from current)
        if (
          newSubjectId !== existingSubjectOffering.subjectId ||
          newSubjectTypeId !== existingSubjectOffering.subjectTypeId
        ) {
          const conflictingOffering = await prisma.subjectOffering.findFirst({
            where: {
              subjectId: newSubjectId,
              subjectTypeId: newSubjectTypeId,
              subjectOfferingId: { not: subjectOfferingId },
            },
          });

          if (conflictingOffering) {
            return NextResponse.json(
              { error: "この科目と科目タイプの組み合わせは既に存在します" },
              { status: 409 }
            );
          }
        }

        // Verify new subject exists and user has access (if changing subject)
        if (subjectId) {
          const subject = await prisma.subject.findUnique({
            where: { subjectId },
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
              { error: "指定された科目にアクセスする権限がありません" },
              { status: 403 }
            );
          }

          updateData.subjectId = subjectId;
        }

        // Verify new subject type exists (if changing subject type)
        if (subjectTypeId) {
          const subjectType = await prisma.subjectType.findUnique({
            where: { subjectTypeId },
          });

          if (!subjectType) {
            return NextResponse.json(
              { error: "指定された科目タイプが存在しません" },
              { status: 400 }
            );
          }

          updateData.subjectTypeId = subjectTypeId;
        }
      }

      // Update subject offering
      const updatedSubjectOffering = await prisma.subjectOffering.update({
        where: { subjectOfferingId },
        data: updateData,
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

      // Format response
      const formattedSubjectOffering = formatSubjectOffering(
        updatedSubjectOffering
      );

      return NextResponse.json({
        data: formattedSubjectOffering,
        message: "科目提供を更新しました",
      });
    } catch (error) {
      console.error("Error updating subject offering:", error);
      return NextResponse.json(
        { error: "科目提供の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a subject offering
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const subjectOfferingId = request.url.split("/").pop();

    if (!subjectOfferingId) {
      return NextResponse.json(
        { error: "科目提供IDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if subject offering exists
      const subjectOffering = await prisma.subjectOffering.findUnique({
        where: { subjectOfferingId },
        include: {
          subject: {
            select: {
              branchId: true,
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

      if (!subjectOffering) {
        return NextResponse.json(
          { error: "科目提供が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this subject offering's branch (non-admin users)
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

      // Check if subject offering is being used
      const totalUsage =
        subjectOffering._count.teacherQualifications +
        subjectOffering._count.studentSubjectPreferences;
      if (totalUsage > 0) {
        return NextResponse.json(
          {
            error:
              "この科目提供は教師の資格または学生の希望で使用されているため削除できません",
          },
          { status: 409 }
        );
      }

      // Delete the subject offering
      await prisma.subjectOffering.delete({
        where: { subjectOfferingId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "科目提供を削除しました",
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
      console.error("Error deleting subject offering:", error);
      return NextResponse.json(
        { error: "科目提供の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
