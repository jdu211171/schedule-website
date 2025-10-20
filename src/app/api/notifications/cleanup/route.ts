import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import {
  cleanupNotifications,
  dryRunCleanup,
  getCleanupStats,
  getEligibleNotifications,
  getCleanupConfigFromEnv,
  CleanupConfig,
} from "@/lib/notification/notification-cleanup";
import {
  validateCleanupOperation,
  createPreCleanupBackup,
  safeCleanupWithBackup,
} from "@/lib/notification/notification-backup";

// GET - Get cleanup statistics and eligible notifications
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const { searchParams } = new URL(request.url);
      const dryRun = searchParams.get("dryRun") === "true";
      const statsOnly = searchParams.get("statsOnly") === "true";

      // Get current notification statistics
      const stats = await getCleanupStats(branchId);

      if (statsOnly) {
        return NextResponse.json({
          success: true,
          data: {
            currentStats: stats,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Get cleanup configuration
      const envConfig = getCleanupConfigFromEnv();
      const config = { ...envConfig, dryRun };

      // Get eligible notifications for cleanup
      const eligibleNotifications = await getEligibleNotifications(
        config as CleanupConfig,
        branchId
      );

      if (dryRun) {
        // Perform dry run
        const result = await dryRunCleanup(config as CleanupConfig, branchId, {
          userId: session.user.id,
          userEmail: session.user.email,
        });
        return NextResponse.json({
          success: true,
          data: {
            dryRunResult: result,
            currentStats: stats,
            eligibleNotifications,
            config,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          currentStats: stats,
          eligibleNotifications,
          config,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error getting cleanup information:", error);
      return NextResponse.json(
        {
          success: false,
          error: "クリーンアップ情報の取得に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);

// POST - Perform cleanup operation
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const body = await request.json();

      // Parse and validate request body
      const {
        dryRun = false,
        retentionDays,
        batchSize,
        maxExecutionTimeMs,
        force = false,
        createBackup = true,
        skipValidation = false,
        validateOnly = false,
      } = body;

      // Validate retention days if provided
      if (retentionDays) {
        const { SENT, FAILED, PENDING, PROCESSING } = retentionDays;
        if (SENT !== undefined && (SENT < 0 || SENT > 365)) {
          return NextResponse.json(
            {
              success: false,
              error: "SENT retention days must be between 0 and 365",
            },
            { status: 400 }
          );
        }
        if (FAILED !== undefined && (FAILED < 0 || FAILED > 365)) {
          return NextResponse.json(
            {
              success: false,
              error: "FAILED retention days must be between 0 and 365",
            },
            { status: 400 }
          );
        }
        if (PENDING !== undefined && PENDING !== 0) {
          return NextResponse.json(
            {
              success: false,
              error: "PENDING notifications cannot be automatically cleaned up",
            },
            { status: 400 }
          );
        }
        if (PROCESSING !== undefined && PROCESSING !== 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                "PROCESSING notifications cannot be automatically cleaned up",
            },
            { status: 400 }
          );
        }
      }

      // Validate batch size
      if (batchSize !== undefined && (batchSize < 1 || batchSize > 10000)) {
        return NextResponse.json(
          { success: false, error: "Batch size must be between 1 and 10000" },
          { status: 400 }
        );
      }

      // Validate max execution time
      if (
        maxExecutionTimeMs !== undefined &&
        (maxExecutionTimeMs < 1000 || maxExecutionTimeMs > 30 * 60 * 1000)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Max execution time must be between 1 second and 30 minutes",
          },
          { status: 400 }
        );
      }

      // Build cleanup configuration
      const envConfig = getCleanupConfigFromEnv();
      const config: Partial<CleanupConfig> = {
        ...envConfig,
        dryRun,
      };

      if (retentionDays) {
        config.retentionDays = {
          SENT: retentionDays.SENT ?? envConfig.retentionDays?.SENT ?? 30,
          FAILED: retentionDays.FAILED ?? envConfig.retentionDays?.FAILED ?? 90,
          PENDING: 0,
          PROCESSING: 0,
        };
      }

      if (batchSize !== undefined) {
        config.batchSize = batchSize;
      }

      if (maxExecutionTimeMs !== undefined) {
        config.maxExecutionTimeMs = maxExecutionTimeMs;
      }

      // Get eligible notifications before cleanup
      const eligibleNotifications = await getEligibleNotifications(
        config as CleanupConfig,
        branchId
      );

      // Check if there are notifications to clean up
      if (eligibleNotifications.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            message: "No notifications eligible for cleanup",
            result: {
              success: true,
              totalProcessed: 0,
              totalDeleted: 0,
              deletedByStatus: {},
              executionTimeMs: 0,
              errors: [],
              dryRun,
            },
            eligibleNotifications: [],
            config,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Perform safety validation and backup if not a dry run
      let validation, backup;
      if (!dryRun) {
        const safetyResult = await safeCleanupWithBackup(
          config.retentionDays || {},
          branchId,
          {
            createBackup,
            skipValidation,
            force,
          }
        );

        validation = safetyResult.validation;
        backup = safetyResult.backup;

        // If validation only is requested, return validation results
        if (validateOnly) {
          return NextResponse.json({
            success: true,
            data: {
              validation,
              backup,
              canProceed: safetyResult.canProceed,
              requiresForce: safetyResult.requiresForce,
              eligibleNotifications,
              config,
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Check if operation can proceed
        if (!safetyResult.canProceed) {
          return NextResponse.json(
            {
              success: false,
              error: "Cleanup operation cannot proceed due to safety checks",
              validation,
              backup,
              requiresForce: safetyResult.requiresForce,
              eligibleNotifications,
            },
            { status: 400 }
          );
        }
      }

      // Safety check for non-dry-run operations
      if (!dryRun && !force) {
        const totalEligible = eligibleNotifications.reduce(
          (sum, n) => sum + n.count,
          0
        );
        if (totalEligible > 10000) {
          return NextResponse.json(
            {
              success: false,
              error: `Large cleanup operation (${totalEligible} notifications). Use force=true to proceed or run in batches.`,
              totalEligible,
              eligibleNotifications,
            },
            { status: 400 }
          );
        }
      }

      // Perform cleanup
      const result = await cleanupNotifications(config, branchId, {
        userId: session.user.id,
        userEmail: session.user.email,
      });

      // Log the cleanup operation
      const operationType = dryRun ? "DRY RUN" : "CLEANUP";
      const logMessage = `${operationType} - User: ${session.user.email}, Branch: ${branchId}, Processed: ${result.totalProcessed}, Deleted: ${result.totalDeleted}`;
      console.log(logMessage);

      return NextResponse.json({
        success: true,
        data: {
          result,
          validation,
          backup,
          eligibleNotifications,
          config,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error performing cleanup:", error);
      return NextResponse.json(
        {
          success: false,
          error: "クリーンアップの実行に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);

// DELETE - Alternative endpoint for cleanup (follows REST conventions)
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const { searchParams } = new URL(request.url);
      const dryRun = searchParams.get("dryRun") === "true";
      const sentRetentionDays = searchParams.get("sentRetentionDays");
      const failedRetentionDays = searchParams.get("failedRetentionDays");
      const batchSize = searchParams.get("batchSize");
      const force = searchParams.get("force") === "true";

      // Build configuration from query parameters
      const envConfig = getCleanupConfigFromEnv();
      const config: Partial<CleanupConfig> = {
        ...envConfig,
        dryRun,
      };

      if (sentRetentionDays || failedRetentionDays) {
        config.retentionDays = {
          SENT: sentRetentionDays
            ? parseInt(sentRetentionDays, 10)
            : (envConfig.retentionDays?.SENT ?? 30),
          FAILED: failedRetentionDays
            ? parseInt(failedRetentionDays, 10)
            : (envConfig.retentionDays?.FAILED ?? 90),
          PENDING: 0,
          PROCESSING: 0,
        };
      }

      if (batchSize) {
        config.batchSize = parseInt(batchSize, 10);
      }

      // Get eligible notifications
      const eligibleNotifications = await getEligibleNotifications(
        config as CleanupConfig,
        branchId
      );

      if (eligibleNotifications.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            message: "No notifications eligible for cleanup",
            result: {
              success: true,
              totalProcessed: 0,
              totalDeleted: 0,
              deletedByStatus: {},
              executionTimeMs: 0,
              errors: [],
              dryRun,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Safety check for large operations
      if (!dryRun && !force) {
        const totalEligible = eligibleNotifications.reduce(
          (sum, n) => sum + n.count,
          0
        );
        if (totalEligible > 10000) {
          return NextResponse.json(
            {
              success: false,
              error: `Large cleanup operation (${totalEligible} notifications). Add force=true to proceed.`,
              totalEligible,
            },
            { status: 400 }
          );
        }
      }

      // Perform cleanup
      const result = await cleanupNotifications(config, branchId, {
        userId: session.user.id,
        userEmail: session.user.email,
      });

      // Log the operation
      const operationType = dryRun ? "DRY RUN" : "CLEANUP";
      const logMessage = `${operationType} - User: ${session.user.email}, Branch: ${branchId}, Processed: ${result.totalProcessed}, Deleted: ${result.totalDeleted}`;
      console.log(logMessage);

      return NextResponse.json({
        success: true,
        data: {
          result,
          config,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error performing cleanup:", error);
      return NextResponse.json(
        {
          success: false,
          error: "クリーンアップの実行に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);
