// src/app/api/archives/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get archive statistics
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      // Get total count of archived records
      const totalArchived = await prisma.archive.count();

      // Get count by month for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const archivesByMonth = await prisma.$queryRaw<
        Array<{ month: string; count: bigint }>
      >`
        SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM archives
        WHERE date >= ${twelveMonthsAgo}
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC
      `;

      // Get storage size estimation (rough estimate based on JSON data)
      const storageStats = await prisma.$queryRaw<
        Array<{ total_size: bigint | null }>
      >`
        SELECT 
          SUM(
            LENGTH(teacher_name::text) + 
            LENGTH(student_name::text) + 
            LENGTH(subject_name::text) + 
            LENGTH(booth_name::text) + 
            LENGTH(branch_name::text) + 
            LENGTH(class_type_name::text) +
            COALESCE(LENGTH(enrolled_students::text), 0) +
            COALESCE(LENGTH(notes::text), 0)
          ) as total_size
        FROM archives
      `;

      // Get date range
      const dateRange = await prisma.archive.aggregate({
        _min: {
          date: true,
        },
        _max: {
          date: true,
        },
      });

      // Get breakdown by branch
      const archivesByBranch = await prisma.archive.groupBy({
        by: ["branchName"],
        _count: {
          archiveId: true,
        },
        orderBy: {
          _count: {
            archiveId: "desc",
          },
        },
      });

      // Convert BigInt to Number for JSON serialization
      const formattedArchivesByMonth = archivesByMonth.map((item) => ({
        month: item.month,
        count: Number(item.count),
      }));

      const stats = {
        totalArchived,
        dateRange: {
          earliest: dateRange._min.date,
          latest: dateRange._max.date,
        },
        archivesByMonth: formattedArchivesByMonth,
        archivesByBranch: archivesByBranch.map((item) => ({
          branchName: item.branchName || "未設定", // "Not set"
          count: item._count.archiveId,
        })),
        estimatedStorageSizeMB: storageStats[0]?.total_size
          ? Number(storageStats[0].total_size) / (1024 * 1024)
          : 0,
      };

      return NextResponse.json({
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching archive statistics:", error);
      return NextResponse.json(
        { error: "アーカイブ統計の取得に失敗しました" }, // "Failed to fetch archive statistics"
        { status: 500 }
      );
    }
  }
);