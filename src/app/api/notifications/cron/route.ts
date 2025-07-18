
import { NextRequest, NextResponse } from 'next/server';
import { runNotificationWorker } from '@/lib/notification/notification-worker';
import { cleanupNotifications, getCleanupConfigFromEnv } from '@/lib/notification/notification-cleanup';

/**
 * API route to trigger the notification worker and cleanup process.
 * This is typically called by external cron services or scheduled tasks.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  const skipCleanup = searchParams.get('skipCleanup') === 'true';
  
  const results = {
    worker: { success: false, message: '' },
    cleanup: { success: false, message: '', skipped: false }
  };

  try {
    // Run notification worker (process pending notifications)
    if (action === 'all' || action === 'worker') {
      try {
        await runNotificationWorker();
        results.worker = { success: true, message: 'Notification worker ran successfully.' };
        console.log('Notification worker completed successfully');
      } catch (error) {
        results.worker = { 
          success: false, 
          message: `Notification worker failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
        console.error('Notification worker failed:', error);
      }
    }

    // Run cleanup process (clean up old notifications)
    if (action === 'all' || action === 'cleanup') {
      if (skipCleanup) {
        results.cleanup = { success: true, message: 'Cleanup skipped by request', skipped: true };
        console.log('Cleanup skipped by request');
      } else {
        try {
          // Get current hour to determine if cleanup should run
          const currentHour = new Date().getHours();
          const cleanupHour = parseInt(process.env.NOTIFICATION_CLEANUP_HOUR || '2', 10);
          
          // Only run cleanup at the specified hour (default: 2 AM)
          if (currentHour === cleanupHour || process.env.NODE_ENV === 'development') {
            const config = getCleanupConfigFromEnv();
            
            // Run cleanup for all branches (pass undefined for branchId)
            const cleanupResult = await cleanupNotifications(config, undefined, {
              userId: 'system-cron',
              userEmail: 'system-cron@cleanup',
            });
            
            if (cleanupResult.success) {
              results.cleanup = { 
                success: true, 
                message: `Cleanup completed: ${cleanupResult.totalDeleted} notifications deleted`,
                skipped: false
              };
              console.log(`Cleanup completed: ${cleanupResult.totalDeleted} notifications deleted in ${cleanupResult.executionTimeMs}ms`);
            } else {
              results.cleanup = { 
                success: false, 
                message: `Cleanup failed: ${cleanupResult.errors.join(', ')}`,
                skipped: false
              };
              console.error('Cleanup failed:', cleanupResult.errors);
            }
          } else {
            results.cleanup = { 
              success: true, 
              message: `Cleanup skipped - not scheduled hour (current: ${currentHour}, scheduled: ${cleanupHour})`,
              skipped: true
            };
            console.log(`Cleanup skipped - not scheduled hour (current: ${currentHour}, scheduled: ${cleanupHour})`);
          }
        } catch (error) {
          results.cleanup = { 
            success: false, 
            message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            skipped: false
          };
          console.error('Cleanup failed:', error);
        }
      }
    }

    // Determine overall success
    const overallSuccess = results.worker.success && results.cleanup.success;
    const statusCode = overallSuccess ? 200 : 500;
    
    return NextResponse.json({
      success: overallSuccess,
      message: 'Notification cron job completed',
      results,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
    
  } catch (error) {
    console.error('Notification cron job failed:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Notification cron job failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
