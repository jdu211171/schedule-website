"use client";

import type React from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
  isLoading?: boolean;
  onCreateNew?: () => void;
  createNewLabel?: string;
  pageCount?: number;
  pageIndex?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  totalItems?: number;
  filterComponent?: React.ReactNode;
  // New multiselect props
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  rowSelection?: RowSelectionState;
  onBatchDelete?: (selectedRows: TData[]) => void;
  // Export functionality
  onExport?: () => void;
  isExporting?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  onSearch,
  searchValue = "",
  isLoading = false,
  onCreateNew,
  createNewLabel = "New Creation",
  pageCount = 1,
  pageIndex = 0,
  onPageChange,
  pageSize = 15,
  totalItems,
  filterComponent,
  // New multiselect props with defaults
  enableRowSelection = false,
  onRowSelectionChange,
  rowSelection: externalRowSelection,
  onBatchDelete,
  onPageSizeChange,
  onExport,
  isExporting = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);
  const [internalRowSelection, setInternalRowSelection] =
    useState<RowSelectionState>({});

  // Use external row selection if provided, otherwise use internal state
  const rowSelection = externalRowSelection ?? internalRowSelection;
  const setRowSelection = onRowSelectionChange
    ? (
        updater:
          | RowSelectionState
          | ((old: RowSelectionState) => RowSelectionState)
      ) => {
        const newSelection =
          typeof updater === "function" ? updater(rowSelection) : updater;
        setInternalRowSelection(newSelection);
        // Get selected row data
        const selectedRowData = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[Number.parseInt(key)])
          .filter(Boolean);
        onRowSelectionChange?.(selectedRowData);
      }
    : setInternalRowSelection;

  const isServerSidePagination = !!onPageChange;

  // Create columns with selection column if multiselect is enabled
  const columnsWithSelection = enableRowSelection
    ? [
        {
          id: "select",
          header: ({ table }: { table: any }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          ),
          cell: ({ row }: { row: any }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: isServerSidePagination
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableRowSelection,
    state: {
      sorting,
      rowSelection,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    manualPagination: isServerSidePagination,
    pageCount: pageCount,
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalSearchValue(value);
    onSearch?.(value);
  };

  const handlePageChange = (page: number) => {
    onPageChange?.(page);
  };

  const handleBatchDelete = () => {
    const selectedRowData = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => data[Number.parseInt(key)])
      .filter(Boolean);

    onBatchDelete?.(selectedRowData);
    setRowSelection({});
  };

  const selectedRowCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onSearch && (
            <Input
              placeholder={searchPlaceholder}
              value={localSearchValue}
              onChange={handleSearchChange}
              className="max-w-sm"
            />
          )}
          {enableRowSelection && selectedRowCount > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">
                {selectedRowCount}件選択中
              </span>
              {onBatchDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                >
                  選択した項目を削除
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "エクスポート中..." : "CSVエクスポート"}
            </Button>
          )}
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              + {createNewLabel}
            </Button>
          )}
        </div>
      </div>
      {filterComponent && <div className="pb-2">{filterComponent}</div>}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as {
                    align?: "left" | "center" | "right";
                    headerClassName?: string;
                    cellClassName?: string;
                    hidden?: boolean;
                  } | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={`${meta?.headerClassName || ""} ${
                        meta?.align === "right" ? "text-right" :
                        meta?.align === "center" ? "text-center" :
                        "text-left"
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <div className={`flex items-center ${
                          meta?.align === "right" ? "justify-end" :
                          meta?.align === "center" ? "justify-center" :
                          "justify-start"
                        }`}>
                          {header.column.getCanSort() ? (
                            <Button
                              variant="ghost"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="ml-2 h-4 w-4" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="ml-2 h-4 w-4" />
                              ) : null}
                            </Button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelection.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={row.getIsSelected() ? "bg-muted/50" : ""}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as {
                      align?: "left" | "center" | "right";
                      headerClassName?: string;
                      cellClassName?: string;
                      hidden?: boolean;
                    } | undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        className={`${meta?.cellClassName || ""} ${
                          meta?.align === "right" ? "text-right" :
                          meta?.align === "center" ? "text-center" :
                          "text-left"
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelection.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(0)}
          disabled={pageIndex === 0}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageIndex - 1)}
          disabled={pageIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium">
            {pageIndex + 1}ページ目 (全{pageCount}ページ)
          </p>
          {totalItems !== undefined && (
            <p className="text-sm text-muted-foreground ml-2">
              全{totalItems}件
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageIndex + 1)}
          disabled={pageIndex >= pageCount - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pageCount - 1)}
          disabled={pageIndex >= pageCount - 1}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
