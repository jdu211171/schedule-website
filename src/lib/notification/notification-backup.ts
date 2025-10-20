import { prisma } from "@/lib/prisma";
import { NotificationStatus } from "@prisma/client";
import { format } from "date-fns";

export interface BackupConfig {
  includeStatuses: NotificationStatus[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  branchId?: string;
  format: "json" | "csv";
  includeRelatedData: boolean;
}

export interface BackupResult {
  success: boolean;
  totalRecords: number;
  backupData: any;
  format: "json" | "csv";
  timestamp: Date;
  config: BackupConfig;
  error?: string;
}

/**
 * Creates a backup of notifications before cleanup
 */
export const createNotificationBackup = async (
  config: BackupConfig
): Promise<BackupResult> => {
  try {
    // Build where clause for backup
    const where: any = {
      status: {
        in: config.includeStatuses,
      },
      createdAt: {
        gte: config.dateRange.startDate,
        lte: config.dateRange.endDate,
      },
    };

    if (config.branchId) {
      where.branchId = config.branchId;
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      include: config.includeRelatedData
        ? {
            branch: {
              select: {
                name: true,
                branchId: true,
              },
            },
          }
        : undefined,
      orderBy: {
        createdAt: "desc",
      },
    });

    let backupData: any;

    if (config.format === "json") {
      backupData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: notifications.length,
          config,
        },
        notifications,
      };
    } else {
      // CSV format
      backupData = convertNotificationsToCSV(notifications);
    }

    return {
      success: true,
      totalRecords: notifications.length,
      backupData,
      format: config.format,
      timestamp: new Date(),
      config,
    };
  } catch (error) {
    return {
      success: false,
      totalRecords: 0,
      backupData: null,
      format: config.format,
      timestamp: new Date(),
      config,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Creates a pre-cleanup backup of notifications that will be deleted
 */
export const createPreCleanupBackup = async (
  retentionDays: { [key in NotificationStatus]?: number },
  branchId?: string
): Promise<BackupResult> => {
  const config: BackupConfig = {
    includeStatuses: [],
    dateRange: {
      startDate: new Date(0), // Start from beginning of time
      endDate: new Date(),
    },
    branchId,
    format: "json",
    includeRelatedData: true,
  };

  // Build the list of statuses and date ranges for backup
  const eligibleStatuses: NotificationStatus[] = [];
  let oldestCutoffDate = new Date();

  for (const [status, days] of Object.entries(retentionDays)) {
    if (days && days > 0) {
      eligibleStatuses.push(status as NotificationStatus);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      if (cutoffDate < oldestCutoffDate) {
        oldestCutoffDate = cutoffDate;
      }
    }
  }

  config.includeStatuses = eligibleStatuses;
  config.dateRange.endDate = oldestCutoffDate;

  return createNotificationBackup(config);
};

/**
 * Converts notifications to CSV format
 */
function convertNotificationsToCSV(notifications: any[]): string {
  if (notifications.length === 0) {
    return "No notifications to export";
  }

  const headers = [
    "notificationId",
    "recipientType",
    "recipientId",
    "notificationType",
    "message",
    "relatedClassId",
    "branchId",
    "branchName",
    "sentVia",
    "sentAt",
    "readAt",
    "status",
    "notes",
    "createdAt",
    "updatedAt",
    "scheduledAt",
    "processingAttempts",
    "logs",
  ];

  const csvRows = [headers.join(",")];

  notifications.forEach((notification) => {
    const row = [
      notification.notificationId,
      notification.recipientType || "",
      notification.recipientId || "",
      notification.notificationType || "",
      `"${(notification.message || "").replace(/"/g, '""')}"`,
      notification.relatedClassId || "",
      notification.branchId || "",
      notification.branch?.name || "",
      notification.sentVia || "",
      notification.sentAt
        ? format(notification.sentAt, "yyyy-MM-dd HH:mm:ss")
        : "",
      notification.readAt
        ? format(notification.readAt, "yyyy-MM-dd HH:mm:ss")
        : "",
      notification.status,
      `"${(notification.notes || "").replace(/"/g, '""')}"`,
      format(notification.createdAt, "yyyy-MM-dd HH:mm:ss"),
      format(notification.updatedAt, "yyyy-MM-dd HH:mm:ss"),
      format(notification.scheduledAt, "yyyy-MM-dd HH:mm:ss"),
      notification.processingAttempts.toString(),
      `"${JSON.stringify(notification.logs || {}).replace(/"/g, '""')}"`,
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

/**
 * Validates cleanup operation for safety
 */
export const validateCleanupOperation = async (
  retentionDays: { [key in NotificationStatus]?: number },
  branchId?: string
): Promise<{
  isValid: boolean;
  warnings: string[];
  errors: string[];
  estimatedDeletions: number;
}> => {
  const warnings: string[] = [];
  const errors: string[] = [];
  let estimatedDeletions = 0;

  try {
    // Check for very aggressive retention policies
    Object.entries(retentionDays).forEach(([status, days]) => {
      if (days && days > 0) {
        if (days < 7) {
          warnings.push(
            `Very short retention period for ${status}: ${days} days`
          );
        }
        if (days < 1) {
          errors.push(`Invalid retention period for ${status}: ${days} days`);
        }
      }
    });

    // Estimate total deletions
    for (const [status, days] of Object.entries(retentionDays)) {
      if (days && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const count = await prisma.notification.count({
          where: {
            status: status as NotificationStatus,
            createdAt: { lt: cutoffDate },
            ...(branchId && { branchId }),
          },
        });

        estimatedDeletions += count;
      }
    }

    // Check for large deletion operations
    if (estimatedDeletions > 10000) {
      warnings.push(
        `Large deletion operation: ${estimatedDeletions} notifications will be deleted`
      );
    }

    if (estimatedDeletions > 50000) {
      errors.push(
        `Extremely large deletion operation: ${estimatedDeletions} notifications. Consider running in smaller batches.`
      );
    }

    // Check for recent notifications being deleted
    const recentNotifications = await prisma.notification.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        status: {
          in: Object.keys(retentionDays).filter(
            (status) =>
              retentionDays[status as NotificationStatus] &&
              retentionDays[status as NotificationStatus]! < 2
          ) as NotificationStatus[],
        },
        ...(branchId && { branchId }),
      },
    });

    if (recentNotifications > 0) {
      warnings.push(
        `${recentNotifications} recent notifications (last 24h) will be deleted`
      );
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      estimatedDeletions,
    };
  } catch (error) {
    return {
      isValid: false,
      warnings,
      errors: [
        ...errors,
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      estimatedDeletions: 0,
    };
  }
};

/**
 * Enhanced cleanup operation with safeguards
 */
export const safeCleanupWithBackup = async (
  retentionDays: { [key in NotificationStatus]?: number },
  branchId?: string,
  options: {
    createBackup?: boolean;
    skipValidation?: boolean;
    force?: boolean;
  } = {}
): Promise<{
  validation: Awaited<ReturnType<typeof validateCleanupOperation>>;
  backup?: BackupResult;
  canProceed: boolean;
  requiresForce: boolean;
}> => {
  const {
    createBackup = true,
    skipValidation = false,
    force = false,
  } = options;

  // Validate the cleanup operation
  const validation = skipValidation
    ? { isValid: true, warnings: [], errors: [], estimatedDeletions: 0 }
    : await validateCleanupOperation(retentionDays, branchId);

  let backup: BackupResult | undefined;

  // Create backup if requested and validation passed
  if (createBackup && validation.isValid) {
    backup = await createPreCleanupBackup(retentionDays, branchId);
    if (!backup.success) {
      validation.errors.push(`Backup creation failed: ${backup.error}`);
      validation.isValid = false;
    }
  }

  // Determine if operation can proceed
  const requiresForce =
    validation.estimatedDeletions > 10000 || validation.warnings.length > 0;
  const canProceed = validation.isValid && (!requiresForce || force);

  return {
    validation,
    backup,
    canProceed,
    requiresForce,
  };
};
