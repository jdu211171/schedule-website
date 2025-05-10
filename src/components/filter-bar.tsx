"use client"
import { type FilterOption, MultiSelectFilter } from "./multi-select-filter"
import { DateRangePicker } from "./date-range-picker"
import { DateRange } from "react-day-picker"

export type FilterConfig = {
  id: string
  label: string
  placeholder: string
  options: FilterOption[]
  type?: "multi-select"
}

export type DateRangeFilterConfig = {
  id: string
  label: string
  type: "date-range"
}

export type AnyFilterConfig = FilterConfig | DateRangeFilterConfig

type FilterBarProps = {
  filters: AnyFilterConfig[]
  selectedFilters: Record<string, string[]>
  dateRangeFilter?: {
    id: string
    value: DateRange | undefined
  }
  onFilterChange: (filterId: string, values: string[]) => void
  onDateRangeChange: (filterId: string, range: DateRange | undefined) => void
  className?: string
}

export function FilterBar({
                            filters,
                            selectedFilters,
                            dateRangeFilter,
                            onFilterChange,
                            onDateRangeChange,
                            className,
                          }: FilterBarProps) {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      }}
    >
      {filters.map((filter) => {
        if (filter.type === "date-range") {
          return (
            <DateRangePicker
              key={filter.id}
              label={filter.label}
              dateRange={dateRangeFilter?.id === filter.id ? dateRangeFilter.value : undefined}
              onChange={(range) => onDateRangeChange(filter.id, range)}
            />
          )
        }

        return (
          <MultiSelectFilter
            key={filter.id}
            label={filter.label}
            placeholder={filter.placeholder}
            options={(filter as FilterConfig).options}
            selectedValues={selectedFilters[filter.id] || []}
            onChange={(values) => onFilterChange(filter.id, values)}
          />
        )
      })}
    </div>
  )
}
