"use client"

import * as React from "react"
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { DragHandle } from "./data-table-v0/drag-handle-v0"
import { DraggableTable } from "./data-table-v0/draggable-table-v0"
import { EditableCell } from "./data-table-v0/editable-cell-v0"
import { InlineEditableCell } from "./data-table-v0/inline-editable-cell-v0"
import { ReviewerSelect } from "./data-table-v0/reviewer-select-v0"
import { StatusBadge } from "./data-table-v0/status-badge-v0"
import { TableActionsMenu } from "./data-table-v0/table-actions-menu-v0"
import { TableCellViewer } from "./data-table-v0/table-cell-viewer-v0"
import { TablePagination } from "./data-table-v0/table-pagination-v0"
import { TableToolbar } from "./data-table-v0/table-toolbar-v0"
import { TypeBadge } from "./data-table-v0/type-badge-v0"

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

interface FilterConfig {
  column: string
  title: string
  options: string[]
  selectedValues: string[]
}

interface ColumnConfig {
  key: string
  editable?: boolean
  searchable?: boolean
  filterable?: boolean
  triggerMode?: "click" | "dblclick"
}

interface DataTableProps {
  data: z.infer<typeof schema>[]
  searchableColumns?: string[]
  columnConfigs?: ColumnConfig[]
  onSearch?: (query: string, columns?: string[]) => void
  onFilter?: (column: string, values: string[]) => void
  onCellEdit?: (rowId: number, column: string, value: string) => void
  onReviewerChange?: (rowId: number, reviewer: string) => void
  onRowEdit?: (rowId: number) => void
  onRowCopy?: (rowId: number) => void
  onRowFavorite?: (rowId: number) => void
  onRowDelete?: (rowId: number) => void
  isLoading?: boolean
}

export function DataTable({
  data: initialData,
  searchableColumns = ["header"],
  columnConfigs = [],
  onSearch,
  onFilter,
  onCellEdit,
  onReviewerChange,
  onRowEdit,
  onRowCopy,
  onRowFavorite,
  onRowDelete,
  isLoading = false,
}: DataTableProps) {
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchValue, setSearchValue] = React.useState("")
  const [filters, setFilters] = React.useState<FilterConfig[]>([])

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data])

  // Initialize filters based on data
  React.useEffect(() => {
    const filterableColumns = columnConfigs.filter((config) => config.filterable)
    const newFilters: FilterConfig[] = filterableColumns.map((config) => {
      const uniqueValues = Array.from(new Set(data.map((row) => row[config.key as keyof typeof row] as string)))
        .filter(Boolean)
        .sort()

      return {
        column: config.key,
        title: config.key.charAt(0).toUpperCase() + config.key.slice(1),
        options: uniqueValues,
        selectedValues: [],
      }
    })
    setFilters(newFilters)
  }, [data, columnConfigs])

  // Optimized handlers with useCallback
  const handleCellEdit = React.useCallback(
    (rowId: number, column: string, value: string) => {
      console.log("Cell edit triggered:", { rowId, column, value })

      // Update local data
      setData((prevData) => prevData.map((row) => (row.id === rowId ? { ...row, [column]: value } : row)))

      // Call API callback
      onCellEdit?.(rowId, column, value)
    },
    [onCellEdit],
  )

  const handleReviewerChange = React.useCallback(
    (rowId: number, reviewer: string) => {
      console.log("Reviewer change triggered:", { rowId, reviewer })

      // Update local data
      setData((prevData) => prevData.map((row) => (row.id === rowId ? { ...row, reviewer } : row)))

      // Call API callback
      onReviewerChange?.(rowId, reviewer)
    },
    [onReviewerChange],
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (active && over && active.id !== over.id) {
        console.log("Reordering rows:", { from: active.id, to: over.id })

        setData((prevData) => {
          const oldIndex = dataIds.indexOf(active.id)
          const newIndex = dataIds.indexOf(over.id)
          const newData = arrayMove(prevData, oldIndex, newIndex)

          // Log the reordering for debugging
          console.log(
            "New order:",
            newData.map((item) => ({ id: item.id, header: item.header })),
          )

          return newData
        })
      }
    },
    [dataIds],
  )

  const handleFilterChange = React.useCallback((column: string, values: string[]) => {
    setFilters((prevFilters) =>
      prevFilters.map((filter) => (filter.column === column ? { ...filter, selectedValues: values } : filter)),
    )
  }, [])

  const getColumnConfig = React.useCallback(
    (columnKey: string) => {
      return columnConfigs.find((config) => config.key === columnKey) || {} as ColumnConfig
    },
    [columnConfigs],
  )

  // Memoized columns definition
  const columns = React.useMemo<ColumnDef<z.infer<typeof schema>>[]>(
    () => [
      {
        id: "drag",
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original.id} />,
        size: 40,
      },
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: "header",
        header: "Title",
        cell: ({ row }) => {
          const config = getColumnConfig("header")
          const value = row.original.header

          // Only enable inline editing for the header/title column
          if (config.editable) {
            return (
              <InlineEditableCell
                value={value}
                onSubmit={(newValue) => handleCellEdit(row.original.id, "header", newValue)}
                placeholder="Enter title..."
                triggerMode={config.triggerMode || "click"}
              />
            )
          }

          return (
            <TableCellViewer item={row.original}>
              <Button variant="link" className="w-fit px-0 text-left text-foreground">
                {value}
              </Button>
            </TableCellViewer>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: "type",
        header: "Section Type",
        cell: ({ row }) => <TypeBadge type={row.original.type} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "target",
        header: () => <div className="w-full text-right">Target</div>,
        cell: ({ row }) => (
          <EditableCell id={row.original.id} value={row.original.target} field="target" header={row.original.header} />
        ),
      },
      {
        accessorKey: "limit",
        header: () => <div className="w-full text-right">Limit</div>,
        cell: ({ row }) => (
          <EditableCell id={row.original.id} value={row.original.limit} field="limit" header={row.original.header} />
        ),
      },
      {
        accessorKey: "reviewer",
        header: "Reviewer",
        cell: ({ row }) => (
          <ReviewerSelect
            id={row.original.id}
            reviewer={row.original.reviewer}
            onReviewerChange={handleReviewerChange}
          />
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <TableActionsMenu
            rowId={row.original.id}
            onEdit={onRowEdit}
            onCopy={onRowCopy}
            onFavorite={onRowFavorite}
            onDelete={onRowDelete}
          />
        ),
        size: 40,
      },
    ],
    [getColumnConfig, handleCellEdit, handleReviewerChange, onRowEdit, onRowCopy, onRowFavorite, onRowDelete],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <Tabs defaultValue="outline" className="flex w-full flex-col justify-start gap-6">
      <TableToolbar
        table={table}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchableColumns={searchableColumns}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={onSearch}
        onFilter={onFilter}
        isLoading={isLoading}
      />
      <TabsContent value="outline" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DraggableTable table={table} dataIds={dataIds} onDragEnd={handleDragEnd} columnsLength={columns.length} />
        </div>
        <TablePagination table={table} />
      </TabsContent>
      <TabsContent value="past-performance" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="focus-documents" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  )
}