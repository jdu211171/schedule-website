// src/app/api/student-types/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentTypeOrderUpdateSchema } from "@/schemas/student-type.schema";

// PATCH - Update student type order
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = studentTypeOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { studentTypeIds } = result.data;

      // Verify all student type IDs exist
      const existingStudentTypes = await prisma.studentType.findMany({
        where: {
          studentTypeId: {
            in: studentTypeIds,
          },
        },
        select: {
          studentTypeId: true,
        },
      });

      if (existingStudentTypes.length !== studentTypeIds.length) {
        return NextResponse.json(
          { error: "一部の生徒タイプIDが存在しません" },
          { status: 400 }
        );
      }

      // Update student type orders in a transaction
      await prisma.$transaction(
        studentTypeIds.map((studentTypeId, index) =>
          prisma.studentType.update({
            where: { studentTypeId },
            data: { order: index + 1 }, // 1-based ordering
          })
        )
      );

      return NextResponse.json({
        message: "生徒タイプの順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating student type order:", error);
      return NextResponse.json(
        { error: "生徒タイプの順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
