import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notification/notification-service';
import { withRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendLineMulticast } from '@/lib/line-multi-channel';

// POST endpoint to test LINE message sending - restricted to ADMIN only
export const POST = withRole(
  ['ADMIN'],
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { lineIds, message, branchId } = body;

      // Validate input
      if (!lineIds || !Array.isArray(lineIds) || lineIds.length === 0) {
        return NextResponse.json(
          { error: 'lineIds array is required' },
          { status: 400 }
        );
      }

      if (!message || typeof message !== 'string') {
        return NextResponse.json(
          { error: 'message string is required' },
          { status: 400 }
        );
      }

      // Check if LINE credentials are configured
      if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        return NextResponse.json(
          { error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' },
          { status: 500 }
        );
      }

      const results = [];
      const errors = [];

      for (const lineId of lineIds) {
        try {
          const notification = await createNotification({
            recipientId: lineId,
            recipientType: 'TEACHER', // Assuming TEACHER for testing
            notificationType: 'TEST',
            message,
            branchId,
            sentVia: 'LINE',
            targetDate: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'), // Today's date at midnight UTC
          });
          
          if (notification) {
            try {
              // Send the LINE message
              const credentials = await import('@/lib/line-multi-channel').then(m => m.getChannelCredentials(branchId || undefined));
              if (credentials) {
                await sendLineMulticast([lineId], message, credentials);
              } else {
                // Fallback to basic LINE function if no credentials found
                const { sendLineMulticast: fallbackMulticast } = await import('@/lib/line');
                await fallbackMulticast([lineId], message, branchId || undefined);
              }
              
              // Update the notification status to SENT after successful LINE message
              await prisma.notification.update({
                where: { notificationId: notification.notificationId },
                data: { 
                  status: 'SENT',
                  sentAt: new Date()
                }
              });
              
              results.push({
                lineId,
                status: 'success',
                notificationId: notification.notificationId,
                messageSent: true
              });
            } catch (lineError: any) {
              // If LINE message fails, update notification status to FAILED
              await prisma.notification.update({
                where: { notificationId: notification.notificationId },
                data: { 
                  status: 'FAILED',
                  logs: { error: lineError.message || 'Failed to send LINE message', timestamp: new Date().toISOString() }
                }
              });
              
              errors.push({
                lineId,
                error: lineError.message || 'Failed to send LINE message',
                notificationId: notification.notificationId
              });
            }
          } else {
            // Notification was a duplicate (already exists)
            results.push({
              lineId,
              status: 'skipped',
              reason: 'Duplicate notification already exists'
            });
          }
        } catch (error: any) {
          errors.push({
            lineId,
            error: error.message || 'Failed to create notification',
          });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: lineIds.length,
          successful: results.length,
          failed: errors.length
        }
      });
    } catch (error) {
      console.error('Error in LINE test send:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error },
        { status: 500 }
      );
    }
  }
);

// GET endpoint to check if LINE is configured
export const GET = withRole(
  ['ADMIN'],
  async () => {
    const isConfigured = !!(
      process.env.LINE_CHANNEL_ACCESS_TOKEN &&
      process.env.LINE_CHANNEL_SECRET
    );

    return NextResponse.json({
      configured: isConfigured,
      hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      hasSecret: !!process.env.LINE_CHANNEL_SECRET,
      testLineIds: [
        'Uaa198c090f417f42b483ff9b7f92ca86',
        'Ub05c6d8a429b250c6820e55152dc60ab'
      ],
      usage: {
        endpoint: 'POST /api/line/test-send',
        body: {
          lineIds: ['array of LINE user IDs'],
          message: 'test message to send',
        }
      }
    });
  }
);