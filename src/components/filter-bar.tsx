"use client"
import { type FilterOption, MultiSelectFilter } from "./multi-select-filter"

export type FilterConfig = {
  id: string
  label: string
  placeholder: string
  options: FilterOption[]
}

type FilterBarProps = {
  filters: FilterConfig[]
  selectedFilters: Record<string, string[]>
  onFilterChange: (filterId: string, values: string[]) => void
  className?: string
}

export function FilterBar({ filters, selectedFilters, onFilterChange, className }: FilterBarProps) {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      }}
    >
      {filters.map((filter) => (
        <MultiSelectFilter
          key={filter.id}
          label={filter.label}
          placeholder={filter.placeholder}
          options={filter.options}
          selectedValues={selectedFilters[filter.id] || []}
          onChange={(values) => onFilterChange(filter.id, values)}
        />
      ))}
    </div>
  )
}
