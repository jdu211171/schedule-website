
import { prisma } from '@/lib/prisma';
import { Notification, NotificationStatus } from '@prisma/client';

interface CreateNotificationParams {
  recipientId: string;
  recipientType: 'STUDENT' | 'TEACHER';
  notificationType: string;
  message: string;
  relatedClassId?: string;
  branchId?: string;
  sentVia?: string;
  scheduledAt?: Date;
}

/**
 * Creates a new notification and adds it to the queue.
 *
 * @param params - The notification details.
 * @returns The created notification.
 */
export const createNotification = async (
  params: CreateNotificationParams
): Promise<Notification> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        ...params,
        status: NotificationStatus.PENDING,
        processingAttempts: 0,
        logs: [],
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw new Error('Could not create notification.');
  }
};
