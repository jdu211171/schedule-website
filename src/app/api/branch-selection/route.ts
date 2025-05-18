// src/app/api/branch-selection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withSelectedBranch } from "@/lib/auth";
import { z } from "zod";

const branchSelectionSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
});

export const POST = withSelectedBranch(
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = branchSelectionSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid branch selection" },
          { status: 400 }
        );
      }

      const { branchId } = result.data;

      // Check if the user has access to this branch
      const userBranches = session.user?.branches || [];
      const hasAccess = userBranches.some(
        (branch) => branch.branchId === branchId
      );

      if (!hasAccess && session.user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "You don't have access to this branch" },
          { status: 403 }
        );
      }

      // Return successful response with updated branch info
      // Note: The actual branch update in the session should be handled by the frontend
      return NextResponse.json({
        data: {
          selectedBranchId: branchId,
          branches: userBranches,
        },
      });
    } catch (error) {
      console.error("Error selecting branch:", error);
      return NextResponse.json(
        { error: "Failed to select branch" },
        { status: 500 }
      );
    }
  }
);
