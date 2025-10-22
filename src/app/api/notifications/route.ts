import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Notification, NotificationStatus } from "@prisma/client";
import { format, subDays } from "date-fns";
import { notificationBulkDeleteSchema } from "@/schemas/notification.schema";

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
  if (notification.recipientType === "STUDENT" && notification.recipientId) {
    const student = await prisma.student.findUnique({
      where: { studentId: notification.recipientId },
      select: { name: true },
    });
    recipientName = student?.name || null;
  } else if (
    notification.recipientType === "TEACHER" &&
    notification.recipientId
  ) {
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
    sentAt: notification.sentAt
      ? format(notification.sentAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
      : null,
    readAt: notification.readAt
      ? format(notification.readAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
      : null,
    status: notification.status,
    notes: notification.notes,
    createdAt: format(notification.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    updatedAt: format(notification.updatedAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    scheduledAt: format(
      notification.scheduledAt,
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    ),
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
      // Build where clause - include both branch-specific and global notifications
      const where: any = {
        OR: [{ branchId: branchId }, { branchId: null }],
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
          mode: "insensitive",
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
            status: "asc", // This will put FAILED first alphabetically
          },
          // Secondary sort: newest first
          {
            scheduledAt: "desc",
          },
          // Tertiary sort: creation time
          {
            createdAt: "desc",
          },
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
        return (
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        );
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

// DELETE - Bulk delete notifications
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = notificationBulkDeleteSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { notificationIds } = result.data;

      // Fetch all notifications to be deleted
      const notificationsToDelete = await prisma.notification.findMany({
        where: {
          notificationId: {
            in: notificationIds,
          },
        },
      });

      if (notificationsToDelete.length === 0) {
        return NextResponse.json(
          { error: "削除対象の通知が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to all notifications' branches (non-admin users)
      if (session.user?.role !== "ADMIN") {
        const unauthorizedNotifications = notificationsToDelete.filter(
          (notification) =>
            notification.branchId && notification.branchId !== branchId
        );

        if (unauthorizedNotifications.length > 0) {
          return NextResponse.json(
            { error: "一部の通知にアクセスする権限がありません" },
            { status: 403 }
          );
        }
      }

      // Count notifications that actually exist and will be deleted
      const actualDeleteCount = notificationsToDelete.length;

      // Delete the notifications
      await prisma.notification.deleteMany({
        where: {
          notificationId: {
            in: notificationIds,
          },
        },
      });

      return NextResponse.json(
        {
          data: [],
          message: `${actualDeleteCount}件の通知を削除しました`,
          pagination: {
            total: 0,
            page: 0,
            limit: 0,
            pages: 0,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error bulk deleting notifications:", error);
      return NextResponse.json(
        { error: "通知の一括削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
