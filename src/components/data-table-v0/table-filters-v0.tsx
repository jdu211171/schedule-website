"use client";

import { ColumnFilter } from "./column-filter-v0";
import { TableSearch } from "./table-search-v0";

type FilterOption = string | { value: string; label: string };

interface FilterConfig {
  column: string;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
}

interface TableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchableColumns?: string[];
  filters: FilterConfig[];
  onFilterChange: (column: string, values: string[]) => void;
  onSearch?: (query: string, columns?: string[]) => void;
  onFilter?: (column: string, values: string[]) => void;
  isLoading?: boolean;
}

export function TableFilters({
  searchValue,
  onSearchChange,
  searchableColumns,
  filters,
  onFilterChange,
  onSearch,
  onFilter,
  isLoading = false,
}: TableFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-2">
      <div className="flex-1 max-w-sm">
        <TableSearch
          value={searchValue}
          onChange={onSearchChange}
          searchableColumns={searchableColumns}
          onSearch={onSearch}
          placeholder="レコードを検索..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <ColumnFilter
            key={filter.column}
            column={filter.column}
            title={filter.title}
            options={filter.options}
            selectedValues={filter.selectedValues}
            onSelectionChange={onFilterChange}
            onFilter={onFilter}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
