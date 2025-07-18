import { NextRequest, NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/auth';
import { NotificationStatus } from '@prisma/client';
import { 
  archiveNotifications, 
  cleanupArchive, 
  getArchiveStats, 
  searchArchive,
  ArchiveConfig 
} from '@/lib/notification/notification-archive';

// GET - Search archive or get archive statistics
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const { searchParams } = new URL(request.url);
      
      const action = searchParams.get('action') || 'search';
      
      if (action === 'stats') {
        // Get archive statistics
        const stats = await getArchiveStats();
        
        return NextResponse.json({
          success: true,
          data: {
            stats,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (action === 'search') {
        // Search archived notifications
        const status = searchParams.get('status') as NotificationStatus | undefined;
        const recipientType = searchParams.get('recipientType');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const filters: any = {
          limit,
          offset,
        };

        if (status) filters.status = status;
        if (recipientType) filters.recipientType = recipientType;
        if (branchId) filters.branchId = branchId;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);

        const result = await searchArchive(filters);

        return NextResponse.json({
          success: true,
          data: {
            records: result.records,
            total: result.total,
            pagination: {
              limit,
              offset,
              total: result.total,
              pages: Math.ceil(result.total / limit),
              currentPage: Math.floor(offset / limit) + 1,
            },
            filters,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "search" or "stats"' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error accessing notification archive:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'アーカイブアクセスに失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);

// POST - Archive notifications or cleanup archive
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      const body = await request.json();
      
      const {
        action = 'archive',
        statuses = [NotificationStatus.SENT, NotificationStatus.FAILED],
        olderThanDays = 90,
        importantOnly = true,
        archiveRetentionDays = 365,
        maxArchiveSize = 100000,
        force = false,
      } = body;

      if (action === 'archive') {
        // Archive notifications
        const config: ArchiveConfig = {
          archiveCriteria: {
            statuses,
            olderThanDays,
            importantOnly,
            branchId,
          },
          retentionPolicy: {
            archiveRetentionDays,
            maxArchiveSize,
          },
        };

        // Validate input
        if (olderThanDays < 1 || olderThanDays > 3650) {
          return NextResponse.json(
            { success: false, error: 'olderThanDays must be between 1 and 3650' },
            { status: 400 }
          );
        }

        if (archiveRetentionDays < 30 || archiveRetentionDays > 3650) {
          return NextResponse.json(
            { success: false, error: 'archiveRetentionDays must be between 30 and 3650' },
            { status: 400 }
          );
        }

        // Safety check for large operations
        if (olderThanDays < 30 && !force) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Archiving notifications less than 30 days old requires force=true',
            },
            { status: 400 }
          );
        }

        const result = await archiveNotifications(config);

        // Log the operation
        console.log(`Archive operation by ${session.user.email}: ${result.totalArchived} notifications archived`);

        return NextResponse.json({
          success: true,
          data: {
            result,
            config,
            performedBy: session.user.email,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (action === 'cleanup') {
        // Cleanup old archive records
        const retentionDays = body.retentionDays || 365;
        const maxRecords = body.maxRecords;

        if (retentionDays < 30) {
          return NextResponse.json(
            { success: false, error: 'Archive retention must be at least 30 days' },
            { status: 400 }
          );
        }

        const result = await cleanupArchive(retentionDays, maxRecords);

        // Log the operation
        console.log(`Archive cleanup by ${session.user.email}: ${result.deletedCount} records deleted`);

        return NextResponse.json({
          success: true,
          data: {
            result,
            retentionDays,
            maxRecords,
            performedBy: session.user.email,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "archive" or "cleanup"' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error performing archive operation:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'アーカイブ操作に失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);

// DELETE - Clean up archive (alternative endpoint)
export const DELETE = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session: any, branchId: string) => {
    try {
      // Only allow full admins to delete archive records
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only administrators can delete archive records' },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const retentionDays = parseInt(searchParams.get('retentionDays') || '365');
      const maxRecords = searchParams.get('maxRecords') ? parseInt(searchParams.get('maxRecords')!) : undefined;
      const confirm = searchParams.get('confirm') === 'true';

      if (!confirm) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Confirmation required. Add confirm=true to delete archive records.' 
          },
          { status: 400 }
        );
      }

      if (retentionDays < 30) {
        return NextResponse.json(
          { success: false, error: 'Archive retention must be at least 30 days' },
          { status: 400 }
        );
      }

      const result = await cleanupArchive(retentionDays, maxRecords);

      // Log the operation
      console.log(`Archive cleanup by ${session.user.email}: ${result.deletedCount} records deleted`);

      return NextResponse.json({
        success: true,
        data: {
          result,
          retentionDays,
          maxRecords,
          performedBy: session.user.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error cleaning up archive:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'アーカイブクリーンアップに失敗しました',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
);