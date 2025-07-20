import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { runNotificationWorker } from '@/lib/notification/notification-worker';

// POST endpoint to manually trigger notification processing - restricted to ADMIN only
export const POST = withRole(
  ['ADMIN'],
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { batchSize, maxConcurrency, maxExecutionTimeMs } = body;

      // Run the notification worker with optional configuration
      const result = await runNotificationWorker({
        batchSize: batchSize || 10,
        maxConcurrency: maxConcurrency || 3,
        maxExecutionTimeMs: maxExecutionTimeMs || 60000 // Default to 1 minute for manual runs
      });

      return NextResponse.json({
        success: true,
        result,
        summary: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          executionTimeMs: result.executionTimeMs,
          batches: result.batches
        }
      });
    } catch (error) {
      console.error('Error running notification worker:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process notifications', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  }
);

// GET endpoint to check pending notifications count - restricted to ADMIN only
export const GET = withRole(
  ['ADMIN'],
  async () => {
    try {
      const { prisma } = await import('@/lib/prisma');
      
      // Count pending notifications
      const pendingCount = await prisma.notification.count({
        where: {
          status: { in: ['PENDING', 'FAILED'] },
          processingAttempts: { lt: 3 },
          scheduledAt: { lte: new Date() }
        }
      });

      // Get a sample of pending notifications
      const pendingSample = await prisma.notification.findMany({
        where: {
          status: { in: ['PENDING', 'FAILED'] },
          processingAttempts: { lt: 3 },
          scheduledAt: { lte: new Date() }
        },
        take: 5,
        orderBy: [
          { processingAttempts: 'asc' },
          { scheduledAt: 'asc' }
        ],
        select: {
          notificationId: true,
          recipientType: true,
          recipientId: true,
          notificationType: true,
          status: true,
          processingAttempts: true,
          scheduledAt: true,
          createdAt: true
        }
      });

      return NextResponse.json({
        pendingCount,
        pendingSample,
        workerConfig: {
          defaultBatchSize: 10,
          defaultMaxConcurrency: 3,
          defaultMaxExecutionTimeMs: 60000
        },
        usage: {
          endpoint: 'POST /api/notifications/process',
          body: {
            batchSize: 'number (optional, default: 10)',
            maxConcurrency: 'number (optional, default: 3)',
            maxExecutionTimeMs: 'number (optional, default: 60000)'
          }
        }
      });
    } catch (error) {
      console.error('Error checking pending notifications:', error);
      return NextResponse.json(
        { 
          error: 'Failed to check pending notifications', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  }
);