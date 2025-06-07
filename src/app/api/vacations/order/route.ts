// src/app/api/vacations/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vacationOrderUpdateSchema } from "@/schemas/vacation.schema";

// PATCH - Update vacation order
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = vacationOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { vacationIds } = result.data;

      // Verify all vacation IDs exist
      const existingVacations = await prisma.vacation.findMany({
        where: {
          id: {
            in: vacationIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingVacations.length !== vacationIds.length) {
        return NextResponse.json(
          { error: "一部の休日IDが存在しません" },
          { status: 400 }
        );
      }

      // Update vacation orders in a transaction
      await prisma.$transaction(
        vacationIds.map((vacationId, index) =>
          prisma.vacation.update({
            where: { id: vacationId },
            data: { order: index + 1 }, // 1-based ordering
          })
        )
      );

      return NextResponse.json({
        message: "休日の順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating vacation order:", error);
      return NextResponse.json(
        { error: "休日の順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
