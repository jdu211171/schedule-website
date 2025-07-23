// src/app/api/archives/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Manually trigger the archive process (uses global settings)
export const POST = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest) => {
    try {
      // Execute the archive function which returns structured data
      const result = await prisma.$queryRaw<
        Array<{
          archived_count: number;
          deleted_count: number;
          error_message: string | null;
        }>
      >`SELECT * FROM archive_old_class_sessions()`;

      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: "アーカイブ処理の実行に失敗しました" }, // "Failed to execute archive process"
          { status: 500 }
        );
      }

      const archiveResult = result[0];

      if (archiveResult.error_message) {
        return NextResponse.json(
          {
            error: "アーカイブ処理でエラーが発生しました", // "Error occurred during archive process"
            details: archiveResult.error_message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: {
          message: "アーカイブ処理が完了しました", // "Archive process completed"
          archivedCount: archiveResult.archived_count,
          deletedCount: archiveResult.deleted_count,
        },
      });
    } catch (error) {
      console.error("Error triggering archive:", error);
      return NextResponse.json(
        { 
          error: "アーカイブ処理の開始に失敗しました", // "Failed to start archive process"
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  }
);