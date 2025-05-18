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

// Helper to get user's branch IDs - reusable across route handlers
export async function getUserBranchIds(userId: string): Promise<string[]> {
  const branches = await prisma.userBranch.findMany({
    where: { userId },
    select: { branchId: true },
  });
  return branches.map((b) => b.branchId);
}
