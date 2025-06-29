"use client"

import { MoreVerticalIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TableActionsMenuProps {
  rowId: number
  onEdit?: (rowId: number) => void
  onCopy?: (rowId: number) => void
  onFavorite?: (rowId: number) => void
  onDelete?: (rowId: number) => void
}

export const TableActionsMenu = React.memo(function TableActionsMenu({
  rowId,
  onEdit,
  onCopy,
  onFavorite,
  onDelete,
}: TableActionsMenuProps) {
  const handleEdit = React.useCallback(() => {
    onEdit?.(rowId)
  }, [onEdit, rowId])

  const handleCopy = React.useCallback(() => {
    onCopy?.(rowId)
  }, [onCopy, rowId])

  const handleFavorite = React.useCallback(() => {
    onFavorite?.(rowId)
  }, [onFavorite, rowId])

  const handleDelete = React.useCallback(() => {
    onDelete?.(rowId)
  }, [onDelete, rowId])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex size-8 text-muted-foreground data-[state=open]:bg-muted hover:bg-muted/50 transition-colors"
          size="icon"
        >
          <MoreVerticalIcon className="size-4" />
          <span className="sr-only">Open menu for row {rowId}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>Make a copy</DropdownMenuItem>
        <DropdownMenuItem onClick={handleFavorite}>Favorite</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})