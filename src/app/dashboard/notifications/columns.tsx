"use client";

import { ColumnDef } from "@tanstack/react-table";
import { NotificationStatus } from "@prisma/client";
import { Notification } from "@/hooks/useNotificationQuery";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getStatusText = (status: NotificationStatus): string => {
  switch (status) {
    case NotificationStatus.SENT:
      return "送信済み";
    case NotificationStatus.FAILED:
      return "失敗";
    case NotificationStatus.PENDING:
      return "待機中";
    case NotificationStatus.PROCESSING:
      return "処理中";
    default:
      return status;
  }
};

export const createColumns = (
  onDelete: (notification: Notification) => void
): ColumnDef<Notification>[] => [
  {
    accessorKey: "recipientName",
    header: "宛先",
    cell: ({ row }) => {
      const recipientName = row.getValue("recipientName") as string | null;
      const recipientType = row.original.recipientType;

      if (!recipientName) {
        return <span className="text-muted-foreground">未設定</span>;
      }

      const variant = recipientType === "STUDENT" ? "outline" : "secondary";
      return <Badge variant={variant}>{recipientName}</Badge>;
    },
  },
  {
    accessorKey: "recipientType",
    header: "タイプ",
    cell: ({ row }) => {
      const type = row.getValue("recipientType") as string | null;
      return type === "STUDENT" ? "生徒" : type === "TEACHER" ? "講師" : "不明";
    },
  },
  {
    accessorKey: "notificationType",
    header: "通知タイプ",
    cell: ({ row }) => {
      const type = row.getValue("notificationType") as string | null;
      if (!type) return "-";

      const typeMap: Record<string, string> = {
        CLASS_REMINDER: "授業リマインダー",
        CLASS_CANCELLATION: "授業キャンセル",
        CLASS_CHANGE: "授業変更",
        GENERAL: "一般通知",
      };

      return typeMap[type] || type;
    },
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => {
      const status = row.getValue("status") as NotificationStatus;
      const statusColor =
        status === NotificationStatus.SENT
          ? "text-green-500"
          : status === NotificationStatus.FAILED
            ? "text-red-500"
            : status === NotificationStatus.PENDING
              ? "text-yellow-500"
              : "text-gray-500";

      return <span className={statusColor}>{getStatusText(status)}</span>;
    },
  },
  {
    accessorKey: "message",
    header: "メッセージ",
    cell: ({ row }) => {
      const message = row.getValue("message") as string | null;
      if (!message) return "-";
      return message.length > 30 ? `${message.substring(0, 30)}...` : message;
    },
  },
  {
    accessorKey: "scheduledAt",
    header: "予定日時",
    cell: ({ row }) => {
      const scheduledAt = row.getValue("scheduledAt") as string;
      return format(parseISO(scheduledAt), "MM/dd HH:mm", { locale: ja });
    },
  },
  {
    accessorKey: "sentAt",
    header: "送信日時",
    cell: ({ row }) => {
      const sentAt = row.getValue("sentAt") as string | null;
      if (!sentAt) return <span className="text-muted-foreground">未送信</span>;
      return format(parseISO(sentAt), "MM/dd HH:mm", { locale: ja });
    },
  },
  {
    accessorKey: "processingAttempts",
    header: "試行回数",
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const notification = row.original;

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>アクション</DropdownMenuLabel>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(notification)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
