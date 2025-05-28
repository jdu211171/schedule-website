// src/app/api/user-subject-preferences/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSubjectPreferenceUpdateSchema } from "@/schemas/user-subject-preference.schema";
import { UserSubjectPreference } from "@prisma/client";

type UserSubjectPreferenceWithIncludes = UserSubjectPreference & {
  user: {
    id: string;
    name: string | null;
    username: string | null;
  };
  subject: {
    subjectId: string;
    name: string;
  };
  subjectType: {
    subjectTypeId: string;
    name: string;
  };
};

type FormattedUserSubjectPreference = {
  id: string;
  userId: string;
  userName: string | null;
  username: string | null;
  subjectId: string;
  subjectName: string;
  subjectTypeId: string;
  subjectTypeName: string;
  createdAt: Date;
};

// Helper function to format user subject preference response
const formatUserSubjectPreference = (
  preference: UserSubjectPreferenceWithIncludes
): FormattedUserSubjectPreference => ({
  id: preference.id,
  userId: preference.userId,
  userName: preference.user.name,
  username: preference.user.username,
  subjectId: preference.subjectId,
  subjectName: preference.subject.name,
  subjectTypeId: preference.subjectTypeId,
  subjectTypeName: preference.subjectType.name,
  createdAt: preference.createdAt,
});

// GET a specific user subject preference by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    const id = request.url.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "設定IDが必要です" }, { status: 400 });
    }

    const preference = await prisma.userSubjectPreference.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
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
    });

    if (!preference) {
      return NextResponse.json(
        { error: "ユーザー科目設定が見つかりません" },
        { status: 404 }
      );
    }

    // Format response
    const formattedPreference = formatUserSubjectPreference(preference);

    return NextResponse.json({
      data: [formattedPreference],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a user subject preference
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const id = request.url.split("/").pop();
      if (!id) {
        return NextResponse.json(
          { error: "設定IDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = userSubjectPreferenceUpdateSchema.safeParse({
        ...body,
        id,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if preference exists
      const existingPreference = await prisma.userSubjectPreference.findUnique({
        where: { id },
      });

      if (!existingPreference) {
        return NextResponse.json(
          { error: "ユーザー科目設定が見つかりません" },
          { status: 404 }
        );
      }

      const { userId, subjectId, subjectTypeId } = result.data;

      // Validate related entities if being updated
      if (userId && userId !== existingPreference.userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return NextResponse.json(
            { error: "指定されたユーザーが存在しません" },
            { status: 400 }
          );
        }
      }

      if (subjectId && subjectId !== existingPreference.subjectId) {
        const subject = await prisma.subject.findUnique({
          where: { subjectId },
        });

        if (!subject) {
          return NextResponse.json(
            { error: "指定された科目が存在しません" },
            { status: 400 }
          );
        }
      }

      if (subjectTypeId && subjectTypeId !== existingPreference.subjectTypeId) {
        const subjectType = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });

        if (!subjectType) {
          return NextResponse.json(
            { error: "指定された科目タイプが存在しません" },
            { status: 400 }
          );
        }
      }

      // Check for duplicate if any key fields are being changed
      const finalUserId = userId || existingPreference.userId;
      const finalSubjectId = subjectId || existingPreference.subjectId;
      const finalSubjectTypeId =
        subjectTypeId || existingPreference.subjectTypeId;

      if (
        userId !== existingPreference.userId ||
        subjectId !== existingPreference.subjectId ||
        subjectTypeId !== existingPreference.subjectTypeId
      ) {
        const duplicatePreference =
          await prisma.userSubjectPreference.findUnique({
            where: {
              userId_subjectId_subjectTypeId: {
                userId: finalUserId,
                subjectId: finalSubjectId,
                subjectTypeId: finalSubjectTypeId,
              },
            },
          });

        if (duplicatePreference && duplicatePreference.id !== id) {
          return NextResponse.json(
            { error: "この設定は既に存在します" },
            { status: 409 }
          );
        }
      }

      // Update preference
      const updatedPreference = await prisma.userSubjectPreference.update({
        where: { id },
        data: {
          userId,
          subjectId,
          subjectTypeId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
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
      });

      // Format response
      const formattedPreference =
        formatUserSubjectPreference(updatedPreference);

      return NextResponse.json({
        data: [formattedPreference],
        message: "ユーザー科目設定を更新しました",
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating user subject preference:", error);
      return NextResponse.json(
        { error: "ユーザー科目設定の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a user subject preference
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    const id = request.url.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "設定IDが必要です" }, { status: 400 });
    }

    try {
      // Check if preference exists
      const preference = await prisma.userSubjectPreference.findUnique({
        where: { id },
      });

      if (!preference) {
        return NextResponse.json(
          { error: "ユーザー科目設定が見つかりません" },
          { status: 404 }
        );
      }

      // Delete the preference
      await prisma.userSubjectPreference.delete({
        where: { id },
      });

      return NextResponse.json(
        {
          data: [],
          message: "ユーザー科目設定を削除しました",
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
      console.error("Error deleting user subject preference:", error);
      return NextResponse.json(
        { error: "ユーザー科目設定の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
