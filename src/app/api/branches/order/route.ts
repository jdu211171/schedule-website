// src/app/api/branches/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchOrderUpdateSchema } from "@/schemas/branch.schema";

// PATCH - Update branch order
export const PATCH = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = branchOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { branchIds } = result.data;

      // Verify all branch IDs exist
      const existingBranches = await prisma.branch.findMany({
        where: {
          branchId: {
            in: branchIds,
          },
        },
        select: {
          branchId: true,
        },
      });

      if (existingBranches.length !== branchIds.length) {
        return NextResponse.json(
          { error: "一部の校舎IDが存在しません" },
          { status: 400 }
        );
      }

      // Update branch orders in a transaction
      await prisma.$transaction(
        branchIds.map((branchId, index) =>
          prisma.branch.update({
            where: { branchId },
            data: { order: index + 1 }, // 1-based ordering
          })
        )
      );

      return NextResponse.json({
        message: "校舎の順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating branch order:", error);
      return NextResponse.json(
        { error: "校舎の順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
