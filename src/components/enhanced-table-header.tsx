"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SortDirection = "ascending" | "descending" | null

type EnhancedTableHeaderProps = {
  label: string
  sortKey?: string
  currentSortKey?: string
  currentSortDirection?: SortDirection
  onSort?: (key: string) => void
  className?: string
}

export function EnhancedTableHeader({
                                      label,
                                      sortKey,
                                      currentSortKey,
                                      currentSortDirection,
                                      onSort,
                                      className,
                                    }: EnhancedTableHeaderProps) {
  const isSorted = sortKey && currentSortKey === sortKey

  const handleSort = React.useCallback(() => {
    if (sortKey && onSort) {
      onSort(sortKey)
    }
  }, [sortKey, onSort])

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className={cn(
        "h-8 px-2 text-left font-medium text-muted-foreground hover:text-foreground",
        !sortKey && "cursor-default",
        className,
      )}
      disabled={!sortKey}
    >
      {label}
      {sortKey && (
        <span className="ml-2">
          {isSorted && currentSortDirection === "ascending" ? (
            <ArrowUp className="h-4 w-4" />
          ) : isSorted && currentSortDirection === "descending" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      )}
    </Button>
  )
}
