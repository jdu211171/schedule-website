"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import type { UniqueIdentifier } from "@dnd-kit/core"
import { TableBody as UITableBody, TableCell, TableRow } from "@/components/ui/table"

interface GenericTableBodyProps<TData> {
  table: ReactTable<TData>
  dataIds: UniqueIdentifier[]
  columnsLength: number
  isDragging: boolean
  sortableId: string
}

export function GenericTableBody<TData>({
  table,
  dataIds,
  columnsLength,
  isDragging,
  sortableId,
}: GenericTableBodyProps<TData>) {
  return (
    <UITableBody>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() && "selected"}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={columnsLength} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </UITableBody>
  )
}