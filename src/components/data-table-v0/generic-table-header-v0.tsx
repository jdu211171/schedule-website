"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

interface GenericTableHeaderProps<TData> {
  table: ReactTable<TData>
}

export function GenericTableHeader<TData>({ table }: GenericTableHeaderProps<TData>) {
  return (
    <UITableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            return (
              <TableHead key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </UITableHeader>
  )
}