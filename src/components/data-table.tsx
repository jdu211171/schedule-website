"use client";

import type React from "react";

import { useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  const isServerSidePagination = !!onPageChange;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isServerSidePagination
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    manualPagination: isServerSidePagination,
    pageCount: pageCount,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchValue(value);
    onSearch?.(value);
  };

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      table.setPageIndex(newPage);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {onSearch && (
          <div className="flex items-center gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={localSearchValue}
              onChange={handleSearchChange}
              className="max-w-sm"
            />
          </div>
        )}
        {onCreateNew && (
          <Button onClick={onCreateNew} className="ml-auto">
            + {createNewLabel}
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
