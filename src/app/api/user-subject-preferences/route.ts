// src/app/api/user-subject-preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  userSubjectPreferenceCreateSchema,
  userSubjectPreferenceFilterSchema,
} from "@/schemas/user-subject-preference.schema";
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

// GET - List user subject preferences with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = userSubjectPreferenceFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, userId, subjectId, subjectTypeId } = result.data;

    // Build filter conditions
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (subjectTypeId) {
      where.subjectTypeId = subjectTypeId;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.userSubjectPreference.count({ where });

    // Fetch preferences with related data
    const preferences = await prisma.userSubjectPreference.findMany({
      where,
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
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Format preferences
    const formattedPreferences = preferences.map(formatUserSubjectPreference);

    return NextResponse.json({
      data: formattedPreferences,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new user subject preference
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = userSubjectPreferenceCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { userId, subjectId, subjectTypeId } = result.data;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: "指定されたユーザーが存在しません" },
          { status: 400 }
        );
      }

      // Check if subject exists
      const subject = await prisma.subject.findUnique({
        where: { subjectId },
      });

      if (!subject) {
        return NextResponse.json(
          { error: "指定された科目が存在しません" },
          { status: 400 }
        );
      }

      // Check if subject type exists
      const subjectType = await prisma.subjectType.findUnique({
        where: { subjectTypeId },
      });

      if (!subjectType) {
        return NextResponse.json(
          { error: "指定された科目タイプが存在しません" },
          { status: 400 }
        );
      }

      // Check if preference already exists
      const existingPreference = await prisma.userSubjectPreference.findUnique({
        where: {
          userId_subjectId_subjectTypeId: {
            userId,
            subjectId,
            subjectTypeId,
          },
        },
      });

      if (existingPreference) {
        return NextResponse.json(
          { error: "この設定は既に存在します" },
          { status: 409 }
        );
      }

      // Create preference
      const newPreference = await prisma.userSubjectPreference.create({
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
      const formattedPreference = formatUserSubjectPreference(newPreference);

      return NextResponse.json(
        {
          data: [formattedPreference],
          message: "ユーザー科目設定を作成しました",
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
      console.error("Error creating user subject preference:", error);
      return NextResponse.json(
        { error: "ユーザー科目設定の作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);
