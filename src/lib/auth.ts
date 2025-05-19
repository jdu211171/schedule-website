// src/lib/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Define the handler type to include session
type RouteHandler = (
  request: NextRequest,
  session: Session
) => Promise<NextResponse>;

// Branch-related route handler type
type BranchRouteHandler = (
  request: NextRequest,
  session: Session,
  branchId: string
) => Promise<NextResponse>;

// Wrapper function to check roles and pass session to handler
export function withRole(allowedRoles: UserRole[], handler: RouteHandler) {
  return async (request: NextRequest) => {
    const session = await auth();

    // Check if user is authenticated and has an allowed role
    if (
      !session ||
      !session.user ||
      !allowedRoles.includes(session.user.role as UserRole)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Pass request and session to the handler
    return handler(request, session as Session);
  };
}

// Wrapper function to check roles, validate branch access, and pass session to handler
export function withBranchAccess(
  allowedRoles: UserRole[],
  handler: BranchRouteHandler
) {
  return async (request: NextRequest) => {
    const session = await auth();
    console.log("withBranchAccess session", session);
    // Check if user is authenticated and has an allowed role
    if (
      !session ||
      !session.user ||
      !allowedRoles.includes(session.user.role as UserRole)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get selected branch from header or use the one in session
    const headerBranchId = request.headers.get("X-Selected-Branch");
    const selectedBranchId = headerBranchId || session.user.selectedBranchId;

    if (!selectedBranchId) {
      return NextResponse.json(
        { error: "支店が選択されていません。先に支店を選択してください。" },
        { status: 400 }
      );
    }

    // Admins can access any branch, but staff must have access to the selected branch
    if (session.user.role !== "ADMIN") {
      const userBranches = session.user.branches || [];
      const hasAccess = userBranches.some(
        (branch) => branch.branchId === selectedBranchId
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You don't have access to this branch" },
          { status: 403 }
        );
      }
    }

    // Pass request, session, and branchId to the handler
    return handler(request, session as Session, selectedBranchId);
  };
}

// API endpoint to set the selected branch
export function withSelectedBranch(handler: RouteHandler) {
  return async (request: NextRequest) => {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Process the request with the session
      return handler(request, session as Session);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to process request" },
        { status: 500 }
      );
    }
  };
}

// Helper to get user's branch IDs - reusable across route handlers
export async function getUserBranchIds(userId: string): Promise<string[]> {
  const branches = await prisma.userBranch.findMany({
    where: { userId },
    select: { branchId: true },
  });
  return branches.map((b) => b.branchId);
}

// Helper to update the selected branch for a user
export async function updateSelectedBranch(
  userId: string,
  branchId: string
): Promise<boolean> {
  try {
    // Verify the user has access to this branch
    const userBranches = await getUserBranchIds(userId);
    if (!userBranches.includes(branchId)) {
      return false;
    }

    // Here we'd update the session with the new selected branch
    // This is a placeholder and would need to be implemented with the
    // appropriate method for your session handling

    return true;
  } catch (error) {
    console.error("Error updating selected branch", error);
    return false;
  }
}
