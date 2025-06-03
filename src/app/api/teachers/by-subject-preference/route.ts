// src/app/api/teachers/by-subject-preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get teachers who have preferences for specific subject and subject types
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const subjectId = url.searchParams.get("subjectId");
      const subjectTypeIdsParam = url.searchParams.get("subjectTypeIds");

      if (!subjectId || !subjectTypeIdsParam) {
        return NextResponse.json(
          { error: "科目IDと科目タイプIDが必要です" },
          { status: 400 }
        );
      }

      const subjectTypeIds = subjectTypeIdsParam.split(",");

      // Find teachers who have preferences for this subject and ANY of the subject types
      const teachers = await prisma.teacher.findMany({
        where: {
          status: "ACTIVE",
          user: {
            subjectPreferences: {
              some: {
                subjectId: subjectId,
                subjectTypeId: {
                  in: subjectTypeIds,
                },
              },
            },
          },
        },
        select: {
          teacherId: true,
          userId: true,
          name: true,
          kanaName: true,
          email: true,
          status: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json({
        data: teachers,
      });
    } catch (error) {
      console.error("Error fetching teachers by subject preference:", error);
      return NextResponse.json(
        { error: "講師の取得に失敗しました" },
        { status: 500 }
      );
    }
  }
);
