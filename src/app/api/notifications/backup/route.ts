import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { NotificationStatus } from "@prisma/client";
import {
  createNotificationBackup,
  createPreCleanupBackup,
  BackupConfig,
} from "@/lib/notification/notification-backup";

// POST - Create a backup of notifications
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const body = await request.json();

      const {
        backupType = "custom", // 'custom', 'pre-cleanup'
        includeStatuses = [NotificationStatus.SENT, NotificationStatus.FAILED],
        startDate,
        endDate,
        format = "json",
        includeRelatedData = true,
        retentionDays, // For pre-cleanup backups
      } = body;

      let backupResult;

      if (backupType === "pre-cleanup") {
        // Create a pre-cleanup backup
        if (!retentionDays) {
          return NextResponse.json(
            {
              success: false,
              error: "retentionDays required for pre-cleanup backup",
            },
            { status: 400 }
          );
        }

        backupResult = await createPreCleanupBackup(retentionDays, branchId);
      } else {
        // Create a custom backup
        if (!startDate || !endDate) {
          return NextResponse.json(
            {
              success: false,
              error: "startDate and endDate required for custom backup",
            },
            { status: 400 }
          );
        }

        const config: BackupConfig = {
          includeStatuses,
          dateRange: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
          branchId,
          format,
          includeRelatedData,
        };

        // Validate date range
        if (config.dateRange.startDate >= config.dateRange.endDate) {
          return NextResponse.json(
            { success: false, error: "startDate must be before endDate" },
            { status: 400 }
          );
        }

        // Validate date range is not too large (max 1 year)
        const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (
          config.dateRange.endDate.getTime() -
            config.dateRange.startDate.getTime() >
          maxRangeMs
        ) {
          return NextResponse.json(
            { success: false, error: "Date range too large (max 1 year)" },
            { status: 400 }
          );
        }

        backupResult = await createNotificationBackup(config);
      }

      if (!backupResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Backup creation failed",
            details: backupResult.error,
          },
          { status: 500 }
        );
      }

      // Log the backup operation
      console.log(
        `Backup created by ${session.user.email}: ${backupResult.totalRecords} records`
      );

      // For CSV format, return as text/csv
      if (format === "csv") {
        return new NextResponse(backupResult.backupData, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="notifications_backup_${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }

      // For JSON format, return as JSON
      return NextResponse.json({
        success: true,
        data: {
          backup: backupResult,
          downloadInfo: {
            totalRecords: backupResult.totalRecords,
            format: backupResult.format,
            timestamp: backupResult.timestamp,
          },
          createdBy: session.user.email,
        },
      });
    } catch (error) {
      console.error("Error creating notification backup:", error);
      return NextResponse.json(
        {
          success: false,
          error: "バックアップの作成に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);

// GET - Get backup information and options
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const { searchParams } = new URL(request.url);
      const info = searchParams.get("info") === "true";

      if (info) {
        // Return information about backup options
        return NextResponse.json({
          success: true,
          data: {
            availableFormats: ["json", "csv"],
            availableStatuses: Object.values(NotificationStatus),
            backupTypes: [
              {
                type: "custom",
                description:
                  "Create a backup for a specific date range and statuses",
                required: ["startDate", "endDate", "includeStatuses"],
                optional: ["format", "includeRelatedData"],
              },
              {
                type: "pre-cleanup",
                description:
                  "Create a backup of notifications that would be deleted by cleanup",
                required: ["retentionDays"],
                optional: ["format", "includeRelatedData"],
              },
            ],
            limits: {
              maxDateRangeDays: 365,
              maxRecordsPerBackup: 100000,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          message:
            "Use POST to create a backup, or GET with ?info=true for backup options",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error getting backup information:", error);
      return NextResponse.json(
        {
          success: false,
          error: "バックアップ情報の取得に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);
