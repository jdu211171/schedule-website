
import { prisma } from '@/lib/prisma';
import { Notification, NotificationStatus } from '@prisma/client';
import { sendLinePush } from '@/lib/line'; // Function to send LINE push messages

const MAX_ATTEMPTS = 3;

/**
 * Processes a single notification.
 *
 * @param notification - The notification to process.
 */
const processNotification = async (notification: Notification): Promise<void> => {
  await prisma.notification.update({
    where: { notificationId: notification.notificationId },
    data: { status: NotificationStatus.PROCESSING },
  });

  try {
    // This is a placeholder for the actual LINE message sending logic
    // You will need to adapt this to your actual implementation
    await sendLinePush(notification.recipientId!, notification.message!);

    await prisma.notification.update({
      where: { notificationId: notification.notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        logs: { success: true, message: 'Message sent successfully' },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.notification.update({
      where: { notificationId: notification.notificationId },
      data: {
        status: NotificationStatus.FAILED,
        processingAttempts: { increment: 1 },
        logs: { success: false, message: errorMessage },
      },
    });
  }
};

/**
 * Fetches and processes pending notifications.
 */
export const runNotificationWorker = async (): Promise<void> => {
  const pendingNotifications = await prisma.notification.findMany({
    where: {
      status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] },
      processingAttempts: { lt: MAX_ATTEMPTS },
      scheduledAt: { lte: new Date() },
    },
    take: 10, // Process 10 notifications at a time
  });

  for (const notification of pendingNotifications) {
    await processNotification(notification);
  }
};
