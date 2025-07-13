
'use client';

import { DataTable as BaseDataTable } from '@/components/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useDataTable({ data, columns, pageCount: 0 });

  return <BaseDataTable data={data} columns={columns} />;
}
