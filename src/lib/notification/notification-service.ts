
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
  targetDate?: Date;
  templateId?: string;
  skipDuplicateCheck?: boolean; // Add flag to skip duplicate check for manual testing
}

/**
 * Checks if a notification already exists for the given parameters.
 *
 * @param params - The notification details to check.
 * @returns True if a notification exists, false otherwise.
 */
export const checkExistingNotification = async (
  params: {
    recipientId: string;
    recipientType: string;
    notificationType: string;
    targetDate: Date;
    branchId?: string | null;
  }
): Promise<boolean> => {
  const existing = await prisma.notification.findFirst({
    where: {
      recipientId: params.recipientId,
      recipientType: params.recipientType,
      notificationType: params.notificationType,
      targetDate: params.targetDate,
      branchId: params.branchId ?? null,
    },
  });
  return !!existing;
};

/**
 * Creates a new notification and adds it to the queue.
 * Checks for duplicates if targetDate is provided.
 *
 * @param params - The notification details.
 * @returns The created notification or null if duplicate exists.
 */
export const createNotification = async (
  params: CreateNotificationParams
): Promise<Notification | null> => {
  try {
    // Skip duplicate check if explicitly requested (for manual testing)
    if (!params.skipDuplicateCheck) {
      // Check for duplicate if targetDate is provided
      if (params.targetDate) {
        const exists = await checkExistingNotification({
          recipientId: params.recipientId,
          recipientType: params.recipientType,
          notificationType: params.notificationType,
          targetDate: params.targetDate,
          branchId: params.branchId,
        });
        
        if (exists) {
          console.log(
            `Duplicate notification prevented for ${params.recipientType} ${params.recipientId} on ${params.targetDate.toISOString().split('T')[0]} (branch=${params.branchId ?? 'none'})`
          );
          return null;
        }
      } else {
        // Check for duplicates without targetDate
        const existing = await prisma.notification.findFirst({
          where: {
            recipientId: params.recipientId,
            recipientType: params.recipientType,
            notificationType: params.notificationType,
            targetDate: null,
            branchId: params.branchId ?? null,
          },
        });
        
        if (existing) {
          console.log(
            `Duplicate notification prevented for ${params.recipientType} ${params.recipientId} (no targetDate, branch=${params.branchId ?? 'none'})`
          );
          return null;
        }
      }
    } else {
      console.log(
        `Skipping duplicate check for ${params.recipientType} ${params.recipientId} (manual test mode)`
      );
      
      // Delete existing notifications for clean testing
      if (params.targetDate) {
        const deleted = await prisma.notification.deleteMany({
          where: {
            recipientId: params.recipientId,
            recipientType: params.recipientType,
            notificationType: params.notificationType,
            targetDate: params.targetDate,
          },
        });
        
        if (deleted.count > 0) {
          console.log(
            `Deleted ${deleted.count} existing notification(s) for ${params.recipientType} ${params.recipientId} on ${params.targetDate.toISOString().split('T')[0]}`
          );
        }
      }
    }

    // Extract skipDuplicateCheck from params before passing to Prisma
    const { skipDuplicateCheck, ...notificationData } = params;
    
    const notification = await prisma.notification.create({
      data: {
        ...notificationData,
        status: NotificationStatus.PENDING,
        processingAttempts: 0,
        logs: [],
      },
    });
    return notification;
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique_daily_notification')) {
      console.log(
        `Duplicate notification prevented (constraint) for ${params.recipientType} ${params.recipientId}`
      );
      return null;
    }
    console.error('Failed to create notification:', error);
    throw new Error('Could not create notification.');
  }
};
