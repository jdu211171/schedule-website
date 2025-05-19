// src/app/api/users/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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
