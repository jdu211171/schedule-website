import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE - Delete a notification
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const notificationId = request.url.split("/").pop();

    if (!notificationId) {
      return NextResponse.json({ error: "通知IDが必要です" }, { status: 400 });
    }

    try {
      // Check if notification exists
      const notification = await prisma.notification.findUnique({
        where: { notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          { error: "通知が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this notification's branch (non-admin users)
      if (
        notification.branchId &&
        notification.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この通知にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the notification
      await prisma.notification.delete({
        where: { notificationId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "通知を削除しました",
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
      console.error("Error deleting notification:", error);
      return NextResponse.json(
        { error: "通知の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
