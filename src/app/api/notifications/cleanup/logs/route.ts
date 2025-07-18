import { NextRequest, NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/auth';
import { 
  cleanupLogger, 
  getCleanupMetrics, 
  getRecentCleanupLogs 
} from '@/lib/notification/notification-cleanup-logger';

// GET - Get cleanup logs and metrics
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Query parameters
      const metricsOnly = searchParams.get('metricsOnly') === 'true';
      const limit = parseInt(searchParams.get('limit') || '50');
      const action = searchParams.get('action') as 'CLEANUP' | 'DRY_RUN' | 'STATS' | undefined;
      const success = searchParams.get('success');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Get metrics
      const metrics = getCleanupMetrics();

      if (metricsOnly) {
        return NextResponse.json({
          success: true,
          data: {
            metrics,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Build filter criteria
      const filters: any = { limit };
      
      if (action) {
        filters.action = action;
      }
      
      if (success !== null && success !== undefined) {
        filters.success = success === 'true';
      }
      
      if (startDate) {
        filters.startDate = new Date(startDate);
      }
      
      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      // For branch-specific requests, filter by branchId
      if (branchId) {
        filters.branchId = branchId;
      }

      // Get filtered logs
      const logs = cleanupLogger.getFilteredLogs(filters);

      return NextResponse.json({
        success: true,
        data: {
          logs,
          metrics,
          totalLogs: logs.length,
          filters,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error fetching cleanup logs:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'クリーンアップログの取得に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);

// DELETE - Clear logs (for testing or maintenance)
export const DELETE = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      // Only allow full admins to clear logs
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Get confirmation from request body
      const body = await request.json().catch(() => ({}));
      const { confirm } = body;

      if (!confirm) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Confirmation required. Send {"confirm": true} to clear logs.' 
          },
          { status: 400 }
        );
      }

      // Get current metrics before clearing
      const metricsBeforeClear = getCleanupMetrics();

      // Clear the logs
      cleanupLogger.clearLogs();

      // Log the action
      console.log(`Cleanup logs cleared by user: ${session.user.email}`);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Cleanup logs cleared successfully',
          metricsBeforeClear,
          clearedBy: session.user.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error clearing cleanup logs:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'ログのクリアに失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);