"use client"

import { GripVerticalIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"

interface DragHandleProps {
  id: number
}

export const DragHandle = React.memo(function DragHandle({ id }: DragHandleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent cursor-grab active:cursor-grabbing"
      tabIndex={-1}
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder row {id}</span>
    </Button>
  )
})