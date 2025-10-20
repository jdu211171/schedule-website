"use client";

import type { Table as ReactTable } from "@tanstack/react-table";
import { ChevronDownIcon, ColumnsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { TableFilters } from "./table-filters-v0";

type FilterOption = string | { value: string; label: string };

interface FilterConfig {
  column: string;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
}

interface GenericTableToolbarProps<TData> {
  table: ReactTable<TData>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchableColumns?: string[];
  filters: FilterConfig[];
  onFilterChange: (column: string, values: string[]) => void;
  onSearch?: (query: string, columns?: string[]) => void;
  onFilter?: (column: string, values: string[]) => void;
  isLoading?: boolean;
}

export function GenericTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  searchableColumns,
  filters,
  onFilterChange,
  onSearch,
  onFilter,
  isLoading = false,
}: GenericTableToolbarProps<TData>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <TableFilters
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchableColumns={searchableColumns}
            filters={filters}
            onFilterChange={onFilterChange}
            onSearch={onSearch}
            onFilter={onFilter}
            isLoading={isLoading}
          />
        </div>
        <div className="ml-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ColumnsIcon className="mr-2 h-4 w-4" />
                <span>列表示</span>
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.columnDef.meta?.label || column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
