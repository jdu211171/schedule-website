"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import type { UniqueIdentifier } from "@dnd-kit/core"

import { TableBody as UITableBody, TableCell, TableRow } from "@/components/ui/table"
import { getPinnedCellStyles } from "@/lib/data-table"
import { cn } from "@/lib/utils"

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
            className="bg-background"
            data-state={row.getIsSelected() && "selected"}
          >
            {row.getVisibleCells().map((cell) => {
              const columnMeta = cell.column.columnDef.meta as
                | { cellClassName?: string }
                | undefined
              const pinnedStyle = getPinnedCellStyles({
                column: cell.column,
                zIndex: 30,
                withBorder: true,
              })
              const isPinned = cell.column.getIsPinned()

              return (
                <TableCell
                  key={cell.id}
                  data-pinned={isPinned || undefined}
                  style={pinnedStyle}
                  className={cn(
                    "bg-inherit",
                    isPinned &&
                      // Solid paint layer to prevent bleed-through from scrolled cells
                      "relative isolate before:absolute before:inset-0 before:bg-background before:content-[''] before:pointer-events-none",
                    columnMeta?.cellClassName,
                  )}
                >
                  <div
                    className={cn(
                      "relative flex min-h-[2.5rem] w-full items-center bg-inherit",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                </TableCell>
              )
            })}
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
