import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET - Get branches accessible to the authenticated user
export const GET = withRole(
  ["ADMIN", "TEACHER", "STUDENT", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }

      // Debug logging
      console.log("Session user:", {
        id: session.user.id,
        userId: session.user.userId,
        role: session.user.role,
      });

      // Fetch branches that the user has access to
      // Note: We use session.user.id (the User table ID) not session.user.userId (teacher/student ID)
      const userBranches = await prisma.userBranch.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          branch: {
            select: {
              branchId: true,
              name: true,
              notes: true,
              order: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: [
          { branch: { order: { sort: "asc", nulls: "last" } } },
          { branch: { name: "asc" } },
        ],
      });

      console.log("Found user branches:", userBranches.length);

      // Format the response to return just the branch data
      const branches = userBranches.map((ub) => ub.branch);

      return NextResponse.json({
        data: branches,
        total: branches.length,
      });
    } catch (error) {
      console.error("Error fetching user branches:", error);
      return NextResponse.json(
        { error: "支店の取得に失敗しました" },
        { status: 500 }
      );
    }
  }
);
