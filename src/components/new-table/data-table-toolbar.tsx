"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Define options for the filters
  const statusOptions = [
    {
      value: "Done",
      label: "Done",
    },
    {
      value: "In Process",
      label: "In Process",
    },
    {
      value: "Not Started",
      label: "Not Started",
    },
  ]

  const typeOptions = [
    {
      value: "Cover page",
      label: "Cover page",
    },
    {
      value: "Table of contents",
      label: "Table of contents",
    },
    {
      value: "Narrative",
      label: "Narrative",
    },
    {
      value: "Technical content",
      label: "Technical content",
    },
    {
      value: "Legal",
      label: "Legal",
    },
    {
      value: "Financial",
      label: "Financial",
    },
    {
      value: "Research",
      label: "Research",
    },
    {
      value: "Visual",
      label: "Visual",
    },
    {
      value: "Plain language",
      label: "Plain language",
    },
    {
      value: "Planning",
      label: "Planning",
    },
  ]

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter headers..."
          value={(table.getColumn("header")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("header")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statusOptions}
          />
        )}
        {table.getColumn("type") && (
          <DataTableFacetedFilter
            column={table.getColumn("type")}
            title="Type"
            options={typeOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}