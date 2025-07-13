
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Notification, NotificationStatus } from '@prisma/client';

const getStatusText = (status: NotificationStatus): string => {
  switch (status) {
    case NotificationStatus.SENT:
      return '送信済み';
    case NotificationStatus.FAILED:
      return '失敗';
    case NotificationStatus.PENDING:
      return '待機中';
    case NotificationStatus.PROCESSING:
      return '処理中';
    default:
      return status;
  }
};

export const columns: ColumnDef<Notification>[] = [
  {
    accessorKey: 'recipientId',
    header: '宛先ID',
  },
  {
    accessorKey: 'recipientType',
    header: '宛先タイプ',
  },
  {
    accessorKey: 'notificationType',
    header: 'タイプ',
  },
  {
    accessorKey: 'status',
    header: 'ステータス',
    cell: ({ row }) => {
      const status = row.getValue('status') as NotificationStatus;
      const statusColor =
        status === NotificationStatus.SENT
          ? 'text-green-500'
          : status === NotificationStatus.FAILED
          ? 'text-red-500'
          : status === NotificationStatus.PENDING
          ? 'text-yellow-500'
          : 'text-gray-500';

      return <span className={statusColor}>{getStatusText(status)}</span>;
    },
  },
  {
    accessorKey: 'scheduledAt',
    header: '予定日時',
    cell: ({ row }) => new Date(row.getValue('scheduledAt')).toLocaleString(),
  },
  {
    accessorKey: 'sentAt',
    header: '送信日時',
    cell: ({ row }) =>
      row.getValue('sentAt')
        ? new Date(row.getValue('sentAt')).toLocaleString()
        : '未送信',
  },
  {
    accessorKey: 'processingAttempts',
    header: '試行回数',
  },
];
