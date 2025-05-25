// src/app/api/teacher-qualifications/[qualificationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherQualificationUpdateSchema } from "@/schemas/teacher-qualification.schema";
import { TeacherQualification } from "@prisma/client";

type FormattedTeacherQualification = {
  qualificationId: string;
  teacherId: string;
  teacherName: string;
  subjectOfferingId: string;
  subjectName: string;
  subjectTypeName: string;
  offeringCode: string | null;
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
      offeringCode: string | null;
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
  offeringCode: qualification.subjectOffering.offeringCode,
  verified: qualification.verified,
  notes: qualification.notes,
  branchId: qualification.subjectOffering.subject.branchId,
  branchName: qualification.subjectOffering.subject.branch?.name || null,
  createdAt: qualification.createdAt.toISOString(),
  updatedAt: qualification.updatedAt.toISOString(),
});

// GET a specific teacher qualification by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const qualificationId = request.url.split("/").pop();

    if (!qualificationId) {
      return NextResponse.json({ error: "資格IDが必要です" }, { status: 400 });
    }

    const qualification = await prisma.teacherQualification.findUnique({
      where: { qualificationId },
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
        subjectOffering: {
          select: {
            offeringCode: true,
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

    if (!qualification) {
      return NextResponse.json(
        { error: "教師資格が見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this qualification
    if (session.user?.role === "TEACHER") {
      // Teachers can only view their own qualifications
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacher || teacher.teacherId !== qualification.teacherId) {
        return NextResponse.json(
          { error: "この教師資格にアクセスする権限がありません" },
          { status: 403 }
        );
      }
    } else if (session.user?.role !== "ADMIN") {
      // Staff can only view qualifications within their branch
      if (
        qualification.subjectOffering.subject.branchId &&
        qualification.subjectOffering.subject.branchId !== branchId
      ) {
        return NextResponse.json(
          { error: "この教師資格にアクセスする権限がありません" },
          { status: 403 }
        );
      }
    }

    // Format response
    const formattedQualification = formatTeacherQualification(qualification);

    return NextResponse.json({
      data: formattedQualification,
    });
  }
);

// PATCH - Update a teacher qualification
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const qualificationId = request.url.split("/").pop();
      if (!qualificationId) {
        return NextResponse.json(
          { error: "資格IDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = teacherQualificationUpdateSchema.safeParse({
        ...body,
        qualificationId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if qualification exists
      const existingQualification =
        await prisma.teacherQualification.findUnique({
          where: { qualificationId },
          include: {
            subjectOffering: {
              select: {
                subject: {
                  select: {
                    branchId: true,
                  },
                },
              },
            },
          },
        });

      if (!existingQualification) {
        return NextResponse.json(
          { error: "教師資格が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this qualification (non-admin users)
      if (
        existingQualification.subjectOffering.subject.branchId &&
        existingQualification.subjectOffering.subject.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この教師資格にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const { teacherId, subjectOfferingId, verified, notes } = result.data;

      // Prepare update data
      const updateData: any = {};
      if (verified !== undefined) updateData.verified = verified;
      if (notes !== undefined) updateData.notes = notes;

      // Handle teacher or subject offering changes
      if (teacherId || subjectOfferingId) {
        const newTeacherId = teacherId || existingQualification.teacherId;
        const newSubjectOfferingId =
          subjectOfferingId || existingQualification.subjectOfferingId;

        // Check if new combination already exists (if it's different from current)
        if (
          newTeacherId !== existingQualification.teacherId ||
          newSubjectOfferingId !== existingQualification.subjectOfferingId
        ) {
          const conflictingQualification =
            await prisma.teacherQualification.findFirst({
              where: {
                teacherId: newTeacherId,
                subjectOfferingId: newSubjectOfferingId,
                qualificationId: { not: qualificationId },
              },
            });

          if (conflictingQualification) {
            return NextResponse.json(
              {
                error:
                  "この教師と科目提供の組み合わせは既に資格として登録されています",
              },
              { status: 409 }
            );
          }
        }

        // Verify new teacher exists (if changing teacher)
        if (teacherId) {
          const teacher = await prisma.teacher.findUnique({
            where: { teacherId },
          });

          if (!teacher) {
            return NextResponse.json(
              { error: "指定された教師が存在しません" },
              { status: 400 }
            );
          }

          updateData.teacherId = teacherId;
        }

        // Verify new subject offering exists and user has access (if changing subject offering)
        if (subjectOfferingId) {
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
              { error: "指定された科目提供にアクセスする権限がありません" },
              { status: 403 }
            );
          }

          updateData.subjectOfferingId = subjectOfferingId;
        }
      }

      // Update teacher qualification
      const updatedQualification = await prisma.teacherQualification.update({
        where: { qualificationId },
        data: updateData,
        include: {
          teacher: {
            select: {
              name: true,
            },
          },
          subjectOffering: {
            select: {
              offeringCode: true,
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

      // Format response
      const formattedQualification =
        formatTeacherQualification(updatedQualification);

      return NextResponse.json({
        data: formattedQualification,
        message: "教師資格を更新しました",
      });
    } catch (error) {
      console.error("Error updating teacher qualification:", error);
      return NextResponse.json(
        { error: "教師資格の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a teacher qualification
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const qualificationId = request.url.split("/").pop();

    if (!qualificationId) {
      return NextResponse.json({ error: "資格IDが必要です" }, { status: 400 });
    }

    try {
      // Check if qualification exists
      const qualification = await prisma.teacherQualification.findUnique({
        where: { qualificationId },
        include: {
          subjectOffering: {
            select: {
              subject: {
                select: {
                  branchId: true,
                },
              },
            },
          },
        },
      });

      if (!qualification) {
        return NextResponse.json(
          { error: "教師資格が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this qualification (non-admin users)
      if (
        qualification.subjectOffering.subject.branchId &&
        qualification.subjectOffering.subject.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この教師資格にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the teacher qualification
      await prisma.teacherQualification.delete({
        where: { qualificationId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "教師資格を削除しました",
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
      console.error("Error deleting teacher qualification:", error);
      return NextResponse.json(
        { error: "教師資格の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
