// src/app/api/booths/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { boothOrderUpdateSchema } from "@/schemas/booth.schema";

// PATCH - Update booth order
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = boothOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { boothIds } = result.data;

      // Verify all booth IDs exist and belong to the correct branch
      const existingBooths = await prisma.booth.findMany({
        where: {
          boothId: {
            in: boothIds,
          },
          branchId, // Ensure booths belong to the user's branch
        },
        select: {
          boothId: true,
        },
      });

      if (existingBooths.length !== boothIds.length) {
        return NextResponse.json(
          { error: "一部のブースIDが存在しないか、アクセス権限がありません" },
          { status: 400 }
        );
      }

      // Update booth orders in a transaction
      await prisma.$transaction(
        boothIds.map((boothId, index) =>
          prisma.booth.update({
            where: { boothId },
            data: { order: index + 1 }, // 1-based ordering
          })
        )
      );

      return NextResponse.json({
        message: "ブースの順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating booth order:", error);
      return NextResponse.json(
        { error: "ブースの順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
