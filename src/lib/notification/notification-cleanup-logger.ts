import { prisma } from "@/lib/prisma";
import { CleanupResult } from "./notification-cleanup";

export interface CleanupLog {
  id: string;
  timestamp: Date;
  action: "CLEANUP" | "DRY_RUN" | "STATS";
  branchId?: string;
  userId?: string;
  userEmail?: string;
  result: CleanupResult;
  config: any;
  executionTimeMs: number;
  success: boolean;
  error?: string;
}

export interface CleanupMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalNotificationsDeleted: number;
  averageExecutionTime: number;
  lastRunTime: Date | null;
  lastSuccessfulRun: Date | null;
  lastFailedRun: Date | null;
}

/**
 * Logs cleanup operations to console and optionally to a persistent store
 */
export class CleanupLogger {
  private static instance: CleanupLogger;
  private logs: CleanupLog[] = [];
  private readonly maxLogsInMemory = 100;

  private constructor() {}

  static getInstance(): CleanupLogger {
    if (!CleanupLogger.instance) {
      CleanupLogger.instance = new CleanupLogger();
    }
    return CleanupLogger.instance;
  }

  /**
   * Log a cleanup operation
   */
  log(
    action: "CLEANUP" | "DRY_RUN" | "STATS",
    result: CleanupResult,
    config: any,
    options: {
      branchId?: string;
      userId?: string;
      userEmail?: string;
      error?: string;
    } = {}
  ): void {
    const logEntry: CleanupLog = {
      id: `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      branchId: options.branchId,
      userId: options.userId,
      userEmail: options.userEmail,
      result,
      config,
      executionTimeMs: result.executionTimeMs,
      success: result.success,
      error: options.error,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Keep only the most recent logs in memory
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }

    // Log to console with appropriate level
    const logLevel = result.success ? "info" : "error";
    const message = this.formatLogMessage(logEntry);

    console[logLevel](message);

    // Log detailed information if needed
    if (result.totalDeleted > 0) {
      console.info(
        `Cleanup details: ${JSON.stringify(result.deletedByStatus)}`
      );
    }

    if (result.errors.length > 0) {
      console.error(`Cleanup errors: ${result.errors.join(", ")}`);
    }
  }

  /**
   * Format log message for console output
   */
  private formatLogMessage(log: CleanupLog): string {
    const { action, result, branchId, userEmail, timestamp } = log;

    const branchInfo = branchId ? `[Branch: ${branchId}]` : "[All Branches]";
    const userInfo = userEmail ? `[User: ${userEmail}]` : "[System]";
    const statusInfo = result.success ? "✓" : "✗";
    const dryRunInfo = result.dryRun ? "[DRY RUN]" : "";

    return (
      `${statusInfo} NOTIFICATION_CLEANUP ${action} ${dryRunInfo} ${branchInfo} ${userInfo} - ` +
      `Processed: ${result.totalProcessed}, Deleted: ${result.totalDeleted}, ` +
      `Time: ${result.executionTimeMs}ms - ${timestamp.toISOString()}`
    );
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 50): CleanupLog[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Get cleanup metrics
   */
  getMetrics(): CleanupMetrics {
    const totalRuns = this.logs.length;
    const successfulRuns = this.logs.filter((log) => log.success).length;
    const failedRuns = totalRuns - successfulRuns;

    const totalNotificationsDeleted = this.logs.reduce(
      (sum, log) => sum + log.result.totalDeleted,
      0
    );

    const averageExecutionTime =
      totalRuns > 0
        ? this.logs.reduce((sum, log) => sum + log.executionTimeMs, 0) /
          totalRuns
        : 0;

    const lastRunTime =
      totalRuns > 0 ? this.logs[this.logs.length - 1].timestamp : null;

    const lastSuccessfulRun =
      this.logs.filter((log) => log.success).pop()?.timestamp || null;

    const lastFailedRun =
      this.logs.filter((log) => !log.success).pop()?.timestamp || null;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      totalNotificationsDeleted,
      averageExecutionTime,
      lastRunTime,
      lastSuccessfulRun,
      lastFailedRun,
    };
  }

  /**
   * Clear logs (useful for testing)
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get logs filtered by criteria
   */
  getFilteredLogs(filters: {
    action?: "CLEANUP" | "DRY_RUN" | "STATS";
    branchId?: string;
    userId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): CleanupLog[] {
    let filteredLogs = this.logs;

    if (filters.action) {
      filteredLogs = filteredLogs.filter(
        (log) => log.action === filters.action
      );
    }

    if (filters.branchId) {
      filteredLogs = filteredLogs.filter(
        (log) => log.branchId === filters.branchId
      );
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(
        (log) => log.userId === filters.userId
      );
    }

    if (filters.success !== undefined) {
      filteredLogs = filteredLogs.filter(
        (log) => log.success === filters.success
      );
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp >= filters.startDate!
      );
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp <= filters.endDate!
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }
}

// Export singleton instance
export const cleanupLogger = CleanupLogger.getInstance();

// Helper functions for common logging operations
export const logCleanupOperation = (
  result: CleanupResult,
  config: any,
  options: {
    branchId?: string;
    userId?: string;
    userEmail?: string;
  } = {}
) => {
  const action = result.dryRun ? "DRY_RUN" : "CLEANUP";
  cleanupLogger.log(action, result, config, options);
};

export const logCleanupStats = (
  result: CleanupResult,
  config: any,
  options: {
    branchId?: string;
    userId?: string;
    userEmail?: string;
  } = {}
) => {
  cleanupLogger.log("STATS", result, config, options);
};

export const getCleanupMetrics = () => cleanupLogger.getMetrics();

export const getRecentCleanupLogs = (limit?: number) =>
  cleanupLogger.getRecentLogs(limit);
