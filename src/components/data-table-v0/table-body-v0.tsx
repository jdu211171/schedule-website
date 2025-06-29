"use client"

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Table as ReactTable } from "@tanstack/react-table"
import type { UniqueIdentifier } from "@dnd-kit/core"
import * as React from "react"
import { z } from "zod"

import { TableBody as UITableBody, TableCell, TableRow } from "@/components/ui/table"

import { DraggableRow } from "./draggable-row-v0"

const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

interface TableBodyProps {
  table: ReactTable<z.infer<typeof schema>>
  dataIds: UniqueIdentifier[]
  columnsLength: number
}

export const TableBody = React.memo(function TableBody({ table, dataIds, columnsLength }: TableBodyProps) {
  const rows = table.getRowModel().rows

  return (
    <UITableBody className="**:data-[slot=table-cell]:first:w-8">
      {rows?.length ? (
        <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
          {rows.map((row) => (
            <DraggableRow key={row.id} row={row} />
          ))}
        </SortableContext>
      ) : (
        <TableRow>
          <TableCell colSpan={columnsLength} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </UITableBody>
  )
})