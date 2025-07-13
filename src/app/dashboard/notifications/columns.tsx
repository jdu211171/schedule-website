
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Notification, NotificationStatus } from '@prisma/client';

export const columns: ColumnDef<Notification>[] = [
  {
    accessorKey: 'recipientId',
    header: 'Recipient ID',
  },
  {
    accessorKey: 'recipientType',
    header: 'Recipient Type',
  },
  {
    accessorKey: 'notificationType',
    header: 'Type',
  },
  {
    accessorKey: 'status',
    header: 'Status',
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

      return <span className={statusColor}>{status}</span>;
    },
  },
  {
    accessorKey: 'scheduledAt',
    header: 'Scheduled At',
    cell: ({ row }) => new Date(row.getValue('scheduledAt')).toLocaleString(),
  },
  {
    accessorKey: 'sentAt',
    header: 'Sent At',
    cell: ({ row }) =>
      row.getValue('sentAt')
        ? new Date(row.getValue('sentAt')).toLocaleString()
        : 'N/A',
  },
  {
    accessorKey: 'processingAttempts',
    header: 'Attempts',
  },
];
