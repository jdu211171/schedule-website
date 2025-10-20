// src/components/ui/sortable-data-table.tsx
"use client";

import type { ColumnDef, ColumnMeta, CellContext } from "@tanstack/react-table";
import { GripVertical, Download, Upload } from "lucide-react";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { UniqueIdentifier } from "@dnd-kit/core";

// Define custom column meta type that extends the default ColumnMeta
interface CustomColumnMeta<TData = unknown> extends ColumnMeta<TData, unknown> {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

// Type for column definitions with custom meta
type CustomColumnDef<TData, TValue> = ColumnDef<TData, TValue> & {
  meta?: CustomColumnMeta<TData>;
};

interface SortableDataTableProps<TData, TValue> {
  // Data
  data: TData[];
  columns: CustomColumnDef<TData, TValue>[];

  // Sorting
  isSortMode: boolean;
  onSortModeChange: (enabled: boolean) => void;
  onReorder: (items: TData[]) => void;
  getItemId: (item: TData) => UniqueIdentifier;
  showSortMode?: boolean; // New prop to control sort mode visibility

  // Optional props
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  createLabel?: string;
  onCreateNew?: () => void;

  // Additional table props
  isLoading?: boolean;
  pageIndex?: number;
  pageCount?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;

  // Custom render props
  renderActions?: (item: TData) => React.ReactNode;
  isItemDisabled?: (item: TData) => boolean;

  // Export functionality
  onExport?: () => void;
  isExporting?: boolean;

  // Import functionality
  onImport?: () => void;
}

export function SortableDataTable<
  TData extends Record<string, unknown>,
  TValue,
>({
  data,
  columns,
  isSortMode,
  onSortModeChange,
  onReorder,
  getItemId,
  showSortMode = true, // Default to true for backward compatibility
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "検索...",
  createLabel = "新規作成",
  onCreateNew,
  isLoading = false,
  pageIndex = 0,
  pageCount = 1,
  pageSize = 10,
  totalItems,
  onPageChange,
  renderActions,
  isItemDisabled,
  onExport,
  isExporting = false,
  onImport,
}: SortableDataTableProps<TData, TValue>) {
  const handleSearch = (value: string) => {
    onSearchChange?.(value);
  };

  const renderCellContent = (
    column: CustomColumnDef<TData, TValue>,
    item: TData
  ) => {
    // If the column has a custom cell renderer, use it
    if (column.cell) {
      // Create a minimal cell context for the cell renderer
      const cellContext = {
        row: {
          original: item,
          getValue: (columnId: string) => (item as any)[columnId],
        },
        getValue: () => {
          const accessorKey = (column as any).accessorKey;
          return accessorKey ? (item as any)[accessorKey] : undefined;
        },
        column: column as any,
        table: {} as any,
        cell: {} as any,
        renderValue: function () {
          return this.getValue();
        },
      } as CellContext<TData, TValue>;

      if (typeof column.cell === "function") {
        return column.cell(cellContext);
      }
      return column.cell;
    }

    // Fallback to accessor key
    const accessorKey = (column as { accessorKey?: string }).accessorKey;
    if (accessorKey) {
      const value = (item as TData)[accessorKey as keyof TData];
      return value != null ? String(value) : "-";
    }

    return "-";
  };

  if (isSortMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex gap-2">
            {onImport && (
              <Button variant="outline" onClick={onImport}>
                <Upload className="mr-2 h-4 w-4" />
                CSVインポート
              </Button>
            )}
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
            <Button variant="outline" onClick={() => onSortModeChange(false)}>
              並び替えを終了
            </Button>
            {onCreateNew && (
              <Button onClick={onCreateNew}>+ {createLabel}</Button>
            )}
          </div>
        </div>

        {/* @ts-expect-error Type inference workaround */}
        <Sortable
          value={data}
          onValueChange={onReorder}
          getItemValue={getItemId}
        >
          <Table className="rounded-none border">
            <TableHeader>
              <TableRow className="bg-accent/50">
                <TableHead className="w-[50px] bg-transparent" />
                {columns.map((column, index) => (
                  <TableHead
                    key={index}
                    className={`bg-transparent ${
                      column.meta?.headerClassName || ""
                    }`}
                  >
                    {typeof column.header === "string"
                      ? column.header
                      : column.header?.toString() || ""}
                  </TableHead>
                ))}
                {renderActions && (
                  <TableHead className="bg-transparent text-right">
                    操作
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <SortableContent asChild>
              <TableBody>
                {data.map((item) => {
                  const itemId = getItemId(item);
                  const isDisabled = isItemDisabled?.(item) || false;

                  return (
                    <SortableItem
                      key={itemId}
                      value={itemId}
                      asChild
                      disabled={isDisabled}
                    >
                      <TableRow>
                        <TableCell className="w-[50px]">
                          <SortableItemHandle asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={isDisabled}
                            >
                              <GripVertical className="h-4 w-4" />
                            </Button>
                          </SortableItemHandle>
                        </TableCell>
                        {columns.map((column, index) => (
                          <TableCell
                            key={index}
                            className={column.meta?.cellClassName}
                          >
                            {renderCellContent(column, item)}
                          </TableCell>
                        ))}
                        {renderActions && (
                          <TableCell className="text-right">
                            {renderActions(item)}
                          </TableCell>
                        )}
                      </TableRow>
                    </SortableItem>
                  );
                })}
              </TableBody>
            </SortableContent>
          </Table>
          <SortableOverlay>
            <div className="size-full rounded-none bg-primary/10" />
          </SortableOverlay>
        </Sortable>

        <div className="flex items-center justify-end space-x-2 py-4">
          <p className="text-sm text-muted-foreground">
            並び替えモードでは、行をドラッグして順序を変更できます
          </p>
        </div>
      </div>
    );
  }

  // Regular table view
  const enhancedColumns: CustomColumnDef<TData, TValue>[] = renderActions
    ? [
        ...columns,
        {
          id: "actions",
          header: "操作",
          cell: ({ row }: CellContext<TData, TValue>) =>
            renderActions(row.original),
          meta: {
            align: "right",
            headerClassName: "pr-8",
          },
        } as CustomColumnDef<TData, TValue>,
      ]
    : columns;

  return (
    <DataTable
      columns={enhancedColumns}
      data={data}
      isLoading={isLoading}
      searchPlaceholder={searchPlaceholder}
      onSearch={onSearchChange}
      searchValue={searchValue}
      onCreateNew={onCreateNew}
      createNewLabel={createLabel}
      pageIndex={pageIndex}
      pageCount={pageCount}
      onPageChange={onPageChange}
      pageSize={pageSize}
      totalItems={totalItems}
      onExport={onExport}
      isExporting={isExporting}
      onImport={onImport}
      filterComponent={
        showSortMode && (
          <div className="flex justify-end">
            <Toggle
              pressed={isSortMode}
              onPressedChange={onSortModeChange}
              aria-label="並び替えモード"
            >
              <GripVertical className="h-4 w-4 mr-2" />
              並び替えモード
            </Toggle>
          </div>
        )
      }
    />
  );
}
