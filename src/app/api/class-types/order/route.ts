// src/app/api/class-types/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classTypeOrderUpdateSchema } from "@/schemas/class-type.schema";

// PATCH - Update class type order
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = classTypeOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { classTypeIds } = result.data;

      // Verify all class type IDs exist
      const existingClassTypes = await prisma.classType.findMany({
        where: {
          classTypeId: {
            in: classTypeIds,
          },
        },
        select: {
          classTypeId: true,
        },
      });

      if (existingClassTypes.length !== classTypeIds.length) {
        return NextResponse.json(
          { error: "一部の授業タイプIDが存在しません" },
          { status: 400 }
        );
      }

      // Update class type orders in a transaction
      await prisma.$transaction(
        classTypeIds.map((classTypeId, index) =>
          prisma.classType.update({
            where: { classTypeId },
            data: { order: index + 1 }, // 1-based ordering
          })
        )
      );

      return NextResponse.json({
        message: "授業タイプの順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating class type order:", error);
      return NextResponse.json(
        { error: "授業タイプの順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
