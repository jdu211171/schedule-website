
import { NextResponse } from 'next/server';
import { runNotificationWorker } from '@/lib/notification/notification-worker';

/**
 * API route to trigger the notification worker.
 */
export async function GET() {
  try {
    await runNotificationWorker();
    return NextResponse.json({ success: true, message: 'Notification worker ran successfully.' });
  } catch (error) {
    console.error('Notification worker failed:', error);
    return NextResponse.json({ success: false, message: 'Notification worker failed.' }, { status: 500 });
  }
}
