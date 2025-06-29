"use client"

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import type { Table as ReactTable } from "@tanstack/react-table"
import * as React from "react"
import { z } from "zod"

import { Table as UI_Table } from "@/components/ui/table"

import { TableBody } from "./table-body-v0"
import { TableHeader } from "./table-header-v0"

const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

interface DraggableTableProps {
  table: ReactTable<z.infer<typeof schema>>
  dataIds: UniqueIdentifier[]
  onDragEnd: (event: DragEndEvent) => void
  columnsLength: number
}

export const DraggableTable = React.memo(function DraggableTable({
  table,
  dataIds,
  onDragEnd,
  columnsLength,
}: DraggableTableProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const sortableId = React.useId()

  // Optimize sensor configuration for better performance
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {}),
  )

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setIsDragging(true)
    console.log("Drag started:", event.active.id)
  }, [])

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false)
      console.log("Drag ended:", event.active?.id, "->", event.over?.id)
      onDragEnd(event)
    },
    [onDragEnd],
  )

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      sensors={sensors}
      id={sortableId}
    >
      <UI_Table className={isDragging ? "select-none" : ""}>
        <TableHeader headerGroups={table.getHeaderGroups()} />
        <TableBody table={table} dataIds={dataIds} columnsLength={columnsLength} />
      </UI_Table>
    </DndContext>
  )
})