// src/app/api/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffCreateSchema, staffFilterSchema } from "@/schemas/staff.schema";
import { User } from "@prisma/client";
import bcrypt from "bcryptjs";

type FormattedStaff = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
  branches: {
    branchId: string;
    name: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format staff response with proper typing
const formatStaff = (
  staff: User & { branches?: { branch: { branchId: string; name: string } }[] }
): FormattedStaff => ({
  id: staff.id,
  name: staff.name,
  username: staff.username,
  email: staff.email,
  role: staff.role,
  branches:
    staff.branches?.map((ub) => ({
      branchId: ub.branch.branchId,
      name: ub.branch.name,
    })) || [],
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

// GET - List staff with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = staffFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name } = result.data;

    // Build filter conditions
    const where: any = {
      role: "STAFF",
    };

    if (name) {
      where.OR = [
        { name: { contains: name, mode: "insensitive" } },
        { username: { contains: name, mode: "insensitive" } },
        { email: { contains: name, mode: "insensitive" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.user.count({ where });

    // Fetch staff with branches
    const staffList = await prisma.user.findMany({
      where,
      include: {
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
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Prepare response data
    const formattedStaff = staffList.map(formatStaff);

    return NextResponse.json({
      data: formattedStaff,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new staff
export const POST = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = staffCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { username, password, email, name, branchIds = [] } = result.data;

      // Check if username or email already exists
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
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

      // Verify that all branchIds exist if provided
      if (branchIds.length > 0) {
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

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create staff user with branch associations in a transaction
      const newStaff = await prisma.$transaction(async (tx) => {
        // Create staff user
        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            email,
            name,
            role: "STAFF",
          },
        });

        // Create branch associations if provided
        if (branchIds.length > 0) {
          await tx.userBranch.createMany({
            data: branchIds.map((branchId) => ({
              userId: user.id,
              branchId,
            })),
          });
        }

        // Return user with branch associations
        return tx.user.findUnique({
          where: { id: user.id },
          include: {
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
          },
        });
      });

      if (!newStaff) {
        throw new Error("Failed to create staff");
      }

      // Format the response
      const formattedStaff = formatStaff(newStaff);

      return NextResponse.json(
        {
          data: [formattedStaff],
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
      console.error("Error creating staff:", error);
      return NextResponse.json(
        { error: "スタッフの作成に失敗しました" }, // "Failed to create staff"
        { status: 500 }
      );
    }
  }
);
