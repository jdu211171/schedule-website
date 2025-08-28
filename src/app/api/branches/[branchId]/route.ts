// src/app/api/branches/[branchId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchUpdateSchema } from "@/schemas/branch.schema";
import { Branch, UserBranch } from "@prisma/client";

type BranchWithUsers = Branch & {
  userBranches: (UserBranch & {
    user: {
      id: string;
      name: string | null;
      username: string | null;
      email: string | null;
      role: string;
    };
  })[];
};

type FormattedBranch = {
  branchId: string;
  name: string;
  notes: string | null;
  order: number | null;
  users: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    role: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format branch response
const formatBranch = (branch: BranchWithUsers): FormattedBranch => ({
  branchId: branch.branchId,
  name: branch.name,
  notes: branch.notes,
  order: branch.order,
  users: branch.userBranches.map((ub) => ub.user),
  createdAt: branch.createdAt,
  updatedAt: branch.updatedAt,
});

// GET a specific branch by ID
export const GET = withBranchAccess(["ADMIN"], async (request: NextRequest) => {
  const branchId = request.url.split("/").pop();

  if (!branchId) {
    return NextResponse.json({ error: "ブースIDは必須です" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { branchId },
    include: {
      userBranches: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!branch) {
    return NextResponse.json(
      { error: "ブースが見つかりません" },
      { status: 404 }
    );
  }

  // Format response
  const formattedBranch = formatBranch(branch);

  return NextResponse.json({
    data: [formattedBranch],
    pagination: {
      total: 1,
      page: 1,
      limit: 1,
      pages: 1,
    },
  });
});

// PATCH - Update a branch
export const PATCH = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest) => {
    try {
      const branchId = request.url.split("/").pop();
      if (!branchId) {
        return NextResponse.json(
          { error: "ブースIDは必須です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = branchUpdateSchema.safeParse({ ...body, branchId });
      if (!result.success) {
        return NextResponse.json(
          { error: "入力内容に誤りがあります: " + result.error.message },
          { status: 400 }
        );
      }

      // Check if branch exists
      const existingBranch = await prisma.branch.findUnique({
        where: { branchId },
      });

      if (!existingBranch) {
        return NextResponse.json(
          { error: "ブースが見つかりません" },
          { status: 404 }
        );
      }

      const { name, notes, order, userIds } = result.data as {
        name?: string;
        notes?: string | null;
        order?: number | null;
        userIds?: string[];
      };

      // Check name uniqueness if being updated
      if (name && name !== existingBranch.name) {
        const nameExists = await prisma.branch.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            branchId: { not: branchId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "このブース名は既に使用されています" },
            { status: 409 }
          );
        }
      }

      // Update branch and user associations in a transaction
      const updatedBranch = await prisma.$transaction(async (tx) => {
        // Update branch
        await tx.branch.update({
          where: { branchId },
          data: {
            name,
            notes,
            order,
          },
        });

        // Update user associations if provided
        if (userIds) {
          // Delete existing user-branch associations
          await tx.userBranch.deleteMany({
            where: { branchId },
          });

          // Create new user-branch associations
          if (userIds.length > 0) {
            await tx.userBranch.createMany({
              data: userIds.map((userId: string) => ({
                branchId,
                userId,
              })),
            });
          }
        }

        // Return updated branch with user associations
        return tx.branch.findUnique({
          where: { branchId },
          include: {
            userBranches: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
      });

      if (!updatedBranch) {
        throw new Error("ブースの更新に失敗しました");
      }

      // Format response
      const formattedBranch = formatBranch(updatedBranch);

      return NextResponse.json({
        data: [formattedBranch],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating branch:", error);
      return NextResponse.json(
        { error: "ブースの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a branch
export const DELETE = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest) => {
    const branchId = request.url.split("/").pop();

    if (!branchId) {
      return NextResponse.json({ error: "ブースIDは必須です" }, { status: 400 });
    }

    try {
      // Check if branch exists
      const branch = await prisma.branch.findUnique({
        where: { branchId },
      });

      if (!branch) {
        return NextResponse.json(
          { error: "ブースが見つかりません" },
          { status: 404 }
        );
      }

      // Check for dependencies
      const boothCount = await prisma.booth.count({
        where: { branchId }
      });

      const classSessionCount = await prisma.classSession.count({
        where: { branchId }
      });

      const vacationCount = await prisma.vacation.count({
        where: { branchId }
      });

      const notificationCount = await prisma.notification.count({
        where: { branchId }
      });

      const userBranchCount = await prisma.userBranch.count({
        where: { branchId }
      });

      const hasAnyDependencies = boothCount > 0 || classSessionCount > 0 ||
                                 vacationCount > 0 || notificationCount > 0 ||
                                 userBranchCount > 0;

      if (hasAnyDependencies) {
        const details = [];
        if (boothCount > 0) details.push(`ブース: ${boothCount}件`);
        if (classSessionCount > 0) details.push(`授業セッション: ${classSessionCount}件`);
        if (vacationCount > 0) details.push(`休暇: ${vacationCount}件`);
        if (notificationCount > 0) details.push(`通知: ${notificationCount}件`);
        if (userBranchCount > 0) details.push(`ユーザー割り当て: ${userBranchCount}件`);

        return NextResponse.json(
          {
            error: `この校舎には関連するデータがあるため削除できません。（${details.join('、')}）`,
            details: {
              booths: boothCount,
              classSessions: classSessionCount,
              vacations: vacationCount,
              notifications: notificationCount,
              userBranches: userBranchCount
            }
          },
          { status: 400 }
        );
      }

      // Delete the branch
      await prisma.branch.delete({
        where: { branchId },
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
      console.error("Error deleting branch:", error);
      return NextResponse.json(
        { error: "ブースの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
