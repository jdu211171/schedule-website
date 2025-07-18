import { prisma } from '@/lib/prisma';
import { NotificationStatus } from '@prisma/client';

export interface ArchiveConfig {
  archiveCriteria: {
    statuses: NotificationStatus[];
    olderThanDays: number;
    importantOnly?: boolean;
    branchId?: string;
  };
  retentionPolicy: {
    archiveRetentionDays: number; // How long to keep in archive before permanent deletion
    maxArchiveSize: number; // Maximum number of records in archive
  };
}

export interface ArchiveResult {
  success: boolean;
  totalArchived: number;
  archivedByStatus: { [key in NotificationStatus]?: number };
  executionTimeMs: number;
  errors: string[];
}

/**
 * Archive notifications before cleanup
 * This moves important notifications to a separate archive table
 */
export const archiveNotifications = async (
  config: ArchiveConfig
): Promise<ArchiveResult> => {
  const startTime = Date.now();
  const result: ArchiveResult = {
    success: false,
    totalArchived: 0,
    archivedByStatus: {},
    executionTimeMs: 0,
    errors: [],
  };

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.archiveCriteria.olderThanDays);

    // Build where clause for notifications to archive
    const where: any = {
      status: { in: config.archiveCriteria.statuses },
      createdAt: { lt: cutoffDate },
    };

    if (config.archiveCriteria.branchId) {
      where.branchId = config.archiveCriteria.branchId;
    }

    // Add criteria for important notifications only
    if (config.archiveCriteria.importantOnly) {
      where.OR = [
        { notificationType: { in: ['CLASS_CANCELLED', 'EMERGENCY', 'SYSTEM_ALERT'] } },
        { relatedClassId: { not: null } },
        { processingAttempts: { gt: 1 } }, // Failed notifications that were retried
      ];
    }

    // Get notifications to archive
    const notificationsToArchive = await prisma.notification.findMany({
      where,
      include: {
        branch: {
          select: { name: true },
        },
      },
    });

    if (notificationsToArchive.length === 0) {
      result.success = true;
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }

    // Archive notifications in a transaction
    await prisma.$transaction(async (tx) => {
      // Create archive records
      for (const notification of notificationsToArchive) {
        await tx.notificationArchive.create({
          data: {
            originalNotificationId: notification.notificationId,
            recipientType: notification.recipientType,
            recipientId: notification.recipientId,
            notificationType: notification.notificationType,
            message: notification.message,
            relatedClassId: notification.relatedClassId,
            branchId: notification.branchId,
            branchName: notification.branch?.name,
            sentVia: notification.sentVia,
            sentAt: notification.sentAt,
            readAt: notification.readAt,
            status: notification.status,
            notes: notification.notes,
            originalCreatedAt: notification.createdAt,
            originalUpdatedAt: notification.updatedAt,
            scheduledAt: notification.scheduledAt,
            processingAttempts: notification.processingAttempts,
            logs: notification.logs as any,
            archivedAt: new Date(),
            archiveReason: 'CLEANUP_ARCHIVE',
          },
        });

        // Count by status
        if (!result.archivedByStatus[notification.status]) {
          result.archivedByStatus[notification.status] = 0;
        }
        result.archivedByStatus[notification.status]!++;
        result.totalArchived++;
      }

      // Delete original notifications
      await tx.notification.deleteMany({
        where: {
          notificationId: {
            in: notificationsToArchive.map(n => n.notificationId),
          },
        },
      });
    });

    result.success = true;
    result.executionTimeMs = Date.now() - startTime;

    console.log(`Archived ${result.totalArchived} notifications in ${result.executionTimeMs}ms`);
    console.log(`Archived by status:`, result.archivedByStatus);

    return result;
  } catch (error) {
    result.success = false;
    result.executionTimeMs = Date.now() - startTime;
    result.errors.push(`Archive failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Notification archiving failed:', error);
    return result;
  }
};

/**
 * Clean up old archive records based on retention policy
 */
export const cleanupArchive = async (
  retentionDays: number = 365,
  maxRecords?: number
): Promise<{
  success: boolean;
  deletedCount: number;
  executionTimeMs: number;
  error?: string;
}> => {
  const startTime = Date.now();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    if (maxRecords) {
      // If max records specified, delete oldest records beyond the limit
      const totalCount = await prisma.notificationArchive.count();
      
      if (totalCount > maxRecords) {
        const recordsToDelete = totalCount - maxRecords;
        
        // Get oldest records to delete
        const oldestRecords = await prisma.notificationArchive.findMany({
          orderBy: { archivedAt: 'asc' },
          take: recordsToDelete,
          select: { id: true },
        });

        const deleteResult = await prisma.notificationArchive.deleteMany({
          where: {
            id: { in: oldestRecords.map(r => r.id) },
          },
        });

        deletedCount = deleteResult.count;
      }
    } else {
      // Delete by date cutoff
      const deleteResult = await prisma.notificationArchive.deleteMany({
        where: {
          archivedAt: { lt: cutoffDate },
        },
      });

      deletedCount = deleteResult.count;
    }

    return {
      success: true,
      deletedCount,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get archive statistics
 */
export const getArchiveStats = async (): Promise<{
  totalRecords: number;
  recordsByStatus: { [key: string]: number };
  oldestRecord: Date | null;
  newestRecord: Date | null;
  recordsByBranch: { [key: string]: number };
}> => {
  const [
    totalRecords,
    statusStats,
    dateStats,
    branchStats,
  ] = await Promise.all([
    prisma.notificationArchive.count(),
    prisma.notificationArchive.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.notificationArchive.aggregate({
      _min: { archivedAt: true },
      _max: { archivedAt: true },
    }),
    prisma.notificationArchive.groupBy({
      by: ['branchName'],
      _count: true,
      where: { branchName: { not: null } },
    }),
  ]);

  const recordsByStatus: { [key: string]: number } = {};
  statusStats.forEach(stat => {
    recordsByStatus[stat.status] = stat._count;
  });

  const recordsByBranch: { [key: string]: number } = {};
  branchStats.forEach(stat => {
    recordsByBranch[stat.branchName || 'Unknown'] = stat._count;
  });

  return {
    totalRecords,
    recordsByStatus,
    oldestRecord: dateStats._min.archivedAt,
    newestRecord: dateStats._max.archivedAt,
    recordsByBranch,
  };
};

/**
 * Search archived notifications
 */
export const searchArchive = async (filters: {
  status?: NotificationStatus;
  branchId?: string;
  recipientType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{
  records: any[];
  total: number;
}> => {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.recipientType) {
    where.recipientType = filters.recipientType;
  }

  if (filters.startDate || filters.endDate) {
    where.archivedAt = {};
    if (filters.startDate) {
      where.archivedAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.archivedAt.lte = filters.endDate;
    }
  }

  const [records, total] = await Promise.all([
    prisma.notificationArchive.findMany({
      where,
      orderBy: { archivedAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.notificationArchive.count({ where }),
  ]);

  return { records, total };
};