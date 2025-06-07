// src/app/api/subject-types/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subjectTypeOrderUpdateSchema } from "@/schemas/subject-type.schema";

// PATCH - Update subject type order
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = subjectTypeOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { subjectTypeIds } = result.data;

      // Verify all subject type IDs exist
      const existingSubjectTypes = await prisma.subjectType.findMany({
        where: {
          subjectTypeId: {
            in: subjectTypeIds,
          },
        },
        select: {
          subjectTypeId: true,
        },
      });

      if (existingSubjectTypes.length !== subjectTypeIds.length) {
        return NextResponse.json(
          { error: "一部の科目タイプIDが存在しません" },
          { status: 400 }
        );
      }

      // Update subject type orders in a transaction
      await prisma.$transaction(
        subjectTypeIds.map((subjectTypeId, index) =>
          prisma.subjectType.update({
            where: { subjectTypeId },
            data: { order: index + 1 }, // 1-based ordering
          })
        )
      );

      return NextResponse.json({
        message: "科目タイプの順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating subject type order:", error);
      return NextResponse.json(
        { error: "科目タイプの順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
