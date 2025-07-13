
import { prisma } from '@/lib/prisma';
import { columns } from './columns';
import { DataTable } from './data-table';

/**
 * Notifications dashboard page.
 */
export default async function NotificationsPage() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <DataTable columns={columns} data={notifications} />
    </div>
  );
}
