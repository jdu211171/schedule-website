
"use client";

import { NotificationDataTable } from './notification-data-table';

/**
 * Notifications dashboard page.
 */
export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">通知</h1>
      <NotificationDataTable />
    </div>
  );
}
