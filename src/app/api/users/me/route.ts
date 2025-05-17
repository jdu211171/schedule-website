// src/app/api/users/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserBranchIds } from "@/lib/auth";
import { UserRole } from "@prisma/client";

// Updated to use withRole like other routes
export const GET = withRole(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"] as UserRole[],
  async (request: NextRequest, session) => {
    try {
      console.log("Session object:", JSON.stringify(session, null, 2));

      // Try to get user ID from different possible places in the session
      const userId = session.user?.id || session.user?.userId || session.user?.id;

      if (!userId) {
        return NextResponse.json(
          { error: "有効なセッション情報がありません" }, // "No valid session information"
          { status: 401 }
        );
      }

      const userRole = session.user?.role;
      console.log("User ID:", userId);
      console.log("User Role:", userRole);

      // Get user from database
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
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "ユーザーが見つかりません" }, // "User not found"
          { status: 404 }
        );
      }

      return NextResponse.json({ user });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { error: "プロフィールの取得に失敗しました" }, // "Failed to fetch profile"
        { status: 500 }
      );
    }
  }
);

