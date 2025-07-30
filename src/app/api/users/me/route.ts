// src/app/api/users/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  image: z.string().url().optional(),
  defaultBranchId: z.string().optional(),
});

// Updated to use withRole like other routes
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"] as UserRole[],
  async (request: NextRequest, session) => {
    try {
      // Try to get user ID from different possible places in the session
      const userId =
        session.user?.id || session.user?.userId || session.user?.id;

      if (!userId) {
        return NextResponse.json(
          { error: "有効なセッション情報がありません" }, // "No valid session information"
          { status: 401 }
        );
      }

      const userRole = session.user?.role;

      // Get user from database with branch information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          defaultBranchId: true,
          branches: {
            include: {
              branch: {
                select: {
                  branchId: true,
                  name: true,
                  notes: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "ユーザーが見つかりません" }, // "User not found"
          { status: 404 }
        );
      }

      // Format branches for the response
      const formattedBranches = user.branches.map((userBranch) => ({
        branchId: userBranch.branch.branchId,
        name: userBranch.branch.name,
        notes: userBranch.branch.notes,
      }));

      // Include the selected branch from the session
      const selectedBranchId =
        session.user?.selectedBranchId ||
        (formattedBranches.length > 0 ? formattedBranches[0].branchId : null);

      return NextResponse.json({
        user: {
          ...user,
          branches: formattedBranches,
          selectedBranchId,
        },
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { error: "プロフィールの取得に失敗しました" }, // "Failed to fetch profile"
        { status: 500 }
      );
    }
  }
);

// PUT/PATCH endpoint to update user profile
export const PUT = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"] as UserRole[],
  async (request: NextRequest, session) => {
    try {
      const userId = session.user?.id || session.user?.userId;

      if (!userId) {
        return NextResponse.json(
          { error: "有効なセッション情報がありません" },
          { status: 401 }
        );
      }

      const body = await request.json();
      const validation = updateUserSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: "無効なリクエストデータ", details: validation.error.errors },
          { status: 400 }
        );
      }

      const { name, image, defaultBranchId } = validation.data;

      // If defaultBranchId is being updated, verify the user has access to that branch
      if (defaultBranchId !== undefined) {
        if (defaultBranchId === null) {
          // Allow clearing the default branch
        } else if (session.user?.role !== "ADMIN") {
          const userBranch = await prisma.userBranch.findUnique({
            where: {
              userId_branchId: {
                userId,
                branchId: defaultBranchId,
              },
            },
          });

          if (!userBranch) {
            return NextResponse.json(
              { error: "選択されたブランチへのアクセス権限がありません" },
              { status: 403 }
            );
          }
        } else {
          // For ADMIN users, verify the branch exists
          const branch = await prisma.branch.findUnique({
            where: { branchId: defaultBranchId },
          });

          if (!branch) {
            return NextResponse.json(
              { error: "選択されたブランチが存在しません" },
              { status: 404 }
            );
          }
        }
      }

      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name }),
          ...(image !== undefined && { image }),
          ...(defaultBranchId !== undefined && { defaultBranchId }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          defaultBranchId: true,
          branches: {
            include: {
              branch: {
                select: {
                  branchId: true,
                  name: true,
                  notes: true,
                },
              },
            },
          },
        },
      });

      // Format branches for the response
      const formattedBranches = updatedUser.branches.map((userBranch) => ({
        branchId: userBranch.branch.branchId,
        name: userBranch.branch.name,
        notes: userBranch.branch.notes,
      }));

      // Include the selected branch from the session
      const selectedBranchId =
        session.user?.selectedBranchId ||
        updatedUser.defaultBranchId ||
        (formattedBranches.length > 0 ? formattedBranches[0].branchId : null);

      return NextResponse.json({
        user: {
          ...updatedUser,
          branches: formattedBranches,
          selectedBranchId,
        },
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      return NextResponse.json(
        { error: "プロフィールの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// PATCH is an alias for PUT
export const PATCH = PUT;
