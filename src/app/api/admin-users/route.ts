import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withFullAdminRole } from "@/lib/auth";
import {
  adminUserCreateSchema,
  adminUserFilterSchema,
} from "@/schemas/adminUser.schema";
import { Prisma } from "@prisma/client";
import { Session } from "next-auth";

// GET - List admin users with pagination and filters (Full Admin only)
export const GET = withFullAdminRole(
  async (request: NextRequest, session: Session) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = adminUserFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" },
        { status: 400 }
      );
    }

    const { page, limit, search, branchId, sortBy = "order", sortOrder = "asc" } = result.data;

    // Build filter conditions
    const where: Prisma.UserWhereInput = {
      role: "ADMIN",
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    // Branch filter
    if (branchId) {
      where.branches = {
        some: {
          branchId: branchId,
        },
      };
    }

    // Execute queries in parallel
    const [totalCount, adminUsers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          order: true,
          isRestrictedAdmin: true,
          createdAt: true,
          updatedAt: true,
          branches: {
            select: {
              branch: {
                select: {
                  branchId: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Transform the data to flatten branch information
    const transformedUsers = adminUsers.map((user) => ({
      ...user,
      branches: user.branches.map((ub) => ub.branch),
    }));

    return NextResponse.json({
      data: transformedUsers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  }
);

// POST - Create new admin user (Full Admin only)
export const POST = withFullAdminRole(
  async (request: NextRequest, session: Session) => {
    try {
      const body = await request.json();
      console.log("Creating admin user with data:", body);

      // Validate request body
      const result = adminUserCreateSchema.safeParse(body);
      if (!result.success) {
        console.log("Validation failed:", result.error.flatten());
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { name, email, username, password, branchIds, isRestrictedAdmin } = result.data;

      // Check if username or email already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return NextResponse.json(
            { error: "このユーザー名は既に使用されています" },
            { status: 409 }
          );
        }
        if (existingUser.email === email) {
          return NextResponse.json(
            { error: "このメールアドレスは既に使用されています" },
            { status: 409 }
          );
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Get the next order value
      const maxOrderResult = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const nextOrder = (maxOrderResult?.order || 0) + 1;

      // Create admin user with branch associations
      const newAdminUser = await prisma.user.create({
        data: {
          name,
          email,
          username,
          passwordHash,
          role: "ADMIN",
          order: nextOrder,
          isRestrictedAdmin,
          branches: {
            create: branchIds.map((branchId) => ({
              branchId,
            })),
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          order: true,
          isRestrictedAdmin: true,
          createdAt: true,
          updatedAt: true,
          branches: {
            select: {
              branch: {
                select: {
                  branchId: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Transform the response
      const transformedUser = {
        ...newAdminUser,
        branches: newAdminUser.branches.map((ub) => ub.branch),
      };

      return NextResponse.json(
        {
          data: transformedUser,
          message: "管理者ユーザーが正常に作成されました",
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating admin user:", error);
      return NextResponse.json(
        { error: "管理者ユーザーの作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);
