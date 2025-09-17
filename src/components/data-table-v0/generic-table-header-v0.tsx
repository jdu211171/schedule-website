"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"

import { TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"
import { getPinnedCellStyles } from "@/lib/data-table"
import { cn } from "@/lib/utils"

interface GenericTableHeaderProps<TData> {
  table: ReactTable<TData>
}

export function GenericTableHeader<TData>({ table }: GenericTableHeaderProps<TData>) {
  return (
    <UITableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const columnMeta = header.column.columnDef.meta as
              | { headerClassName?: string }
              | undefined
            const canPin = header.colSpan === 1
            const pinnedStyle = canPin
              ? getPinnedCellStyles({
                  column: header.column,
                  zIndex: 40,
                  withBorder: true,
                })
              : undefined
            const isPinned = canPin ? header.column.getIsPinned() : false

            return (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
                data-pinned={isPinned || undefined}
                style={pinnedStyle}
                className={cn(
                  "bg-background",
                  columnMeta?.headerClassName,
                )}
              >
                <div className="relative flex min-h-[2.75rem] w-full items-center bg-background">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </UITableHeader>
  )
}
