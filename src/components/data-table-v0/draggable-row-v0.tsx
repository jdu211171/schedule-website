"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { type Row, flexRender } from "@tanstack/react-table"
import * as React from "react"
import { z } from "zod"

import { TableCell, TableRow } from "@/components/ui/table"

const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

interface DraggableRowProps {
  row: Row<z.infer<typeof schema>>
}

export const DraggableRow = React.memo(function DraggableRow({ row }: DraggableRowProps) {
  const { transform, transition, setNodeRef, isDragging, attributes, listeners } = useSortable({
    id: row.original.id,
  })

  const style = React.useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition: transition,
    }),
    [transform, transition],
  )

  return (
    <TableRow
      data-state={row.getIsSelected() ? "selected" : undefined}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-50 data-[dragging=true]:opacity-90 data-[dragging=true]:shadow-lg data-[dragging=true]:bg-background"
      style={style}
      {...attributes}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} {...(cell.column.id === "drag" ? listeners : {})}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
})