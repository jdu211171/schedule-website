import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Notification, NotificationStatus } from "@prisma/client";
import { format, subDays } from "date-fns";

type FormattedNotification = {
  notificationId: string;
  recipientType: string | null;
  recipientId: string | null;
  recipientName: string | null;
  notificationType: string | null;
  message: string | null;
  relatedClassId: string | null;
  branchId: string | null;
  branchName: string | null;
  sentVia: string | null;
  sentAt: string | null;
  readAt: string | null;
  status: NotificationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string;
  processingAttempts: number;
  logs: any;
};

// Helper function to format notification response
const formatNotification = async (
  notification: Notification & {
    branch?: { name: string } | null;
  }
): Promise<FormattedNotification> => {
  // Determine recipient name based on type
  let recipientName = null;
  if (notification.recipientType === 'STUDENT' && notification.recipientId) {
    const student = await prisma.student.findUnique({
      where: { studentId: notification.recipientId },
      select: { name: true },
    });
    recipientName = student?.name || null;
  } else if (notification.recipientType === 'TEACHER' && notification.recipientId) {
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId: notification.recipientId },
      select: { name: true },
    });
    recipientName = teacher?.name || null;
  }

  return {
    notificationId: notification.notificationId,
    recipientType: notification.recipientType,
    recipientId: notification.recipientId,
    recipientName,
    notificationType: notification.notificationType,
    message: notification.message,
    relatedClassId: notification.relatedClassId,
    branchId: notification.branchId,
    branchName: notification.branch?.name || null,
    sentVia: notification.sentVia,
    sentAt: notification.sentAt ? format(notification.sentAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : null,
    readAt: notification.readAt ? format(notification.readAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : null,
    status: notification.status,
    notes: notification.notes,
    createdAt: format(notification.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    updatedAt: format(notification.updatedAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    scheduledAt: format(notification.scheduledAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    processingAttempts: notification.processingAttempts,
    logs: notification.logs,
  };
};

// GET notifications with filtering and sorting
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session: any, branchId: string) => {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status") as NotificationStatus | null;
    const recipientType = searchParams.get("recipientType");
    const notificationType = searchParams.get("notificationType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // Default to yesterday if no date filter provided
    const defaultStartDate = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const defaultEndDate = format(new Date(), "yyyy-MM-dd");

    const actualStartDate = startDate || defaultStartDate;
    const actualEndDate = endDate || defaultEndDate;

    try {
      // Build where clause
      const where: any = {
        branchId: branchId,
      };

      // Status filter
      if (status) {
        where.status = status;
      }

      // Recipient type filter
      if (recipientType) {
        where.recipientType = recipientType;
      }

      // Notification type filter  
      if (notificationType) {
        where.notificationType = notificationType;
      }

      // Date range filter (using scheduledAt)
      if (actualStartDate || actualEndDate) {
        where.scheduledAt = {};
        if (actualStartDate) {
          where.scheduledAt.gte = new Date(`${actualStartDate}T00:00:00.000Z`);
        }
        if (actualEndDate) {
          where.scheduledAt.lte = new Date(`${actualEndDate}T23:59:59.999Z`);
        }
      }

      // Search filter (case-insensitive search in message content)
      if (search) {
        where.message = {
          contains: search,
          mode: 'insensitive'
        };
      }

      // Get total count
      const total = await prisma.notification.count({ where });

      // Fetch notifications
      const notifications = await prisma.notification.findMany({
        where,
        include: {
          branch: {
            select: { name: true },
          },
        },
        orderBy: [
          // Primary sort: failed notifications first
          {
            status: "asc" // This will put FAILED first alphabetically
          },
          // Secondary sort: newest first
          {
            scheduledAt: "desc"
          },
          // Tertiary sort: creation time
          {
            createdAt: "desc"
          }
        ],
        skip: offset,
        take: limit,
      });

      // Custom sort to ensure proper priority: FAILED → PENDING → PROCESSING → SENT
      const statusPriority = {
        [NotificationStatus.FAILED]: 0,
        [NotificationStatus.PENDING]: 1, 
        [NotificationStatus.PROCESSING]: 2,
        [NotificationStatus.SENT]: 3,
      };

      const sortedNotifications = notifications.sort((a, b) => {
        const aPriority = statusPriority[a.status];
        const bPriority = statusPriority[b.status];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same status, sort by scheduled date (newest first)
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
      });

      // Format response
      const formattedNotifications = await Promise.all(
        sortedNotifications.map(formatNotification)
      );

      return NextResponse.json({
        data: formattedNotifications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "通知の取得に失敗しました" },
        { status: 500 }
      );
    }
  }
);