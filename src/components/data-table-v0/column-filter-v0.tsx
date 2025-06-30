"use client"

import { CheckIcon, FilterIcon } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type FilterOption = string | { value: string; label: string };

interface ColumnFilterProps {
  column: string
  title: string
  options: FilterOption[]
  selectedValues: string[]
  onSelectionChange: (column: string, values: string[]) => void
  onFilter?: (column: string, values: string[]) => void
  isLoading?: boolean
}

export function ColumnFilter({
  column,
  title,
  options,
  selectedValues,
  onSelectionChange,
  onFilter,
  isLoading = false,
}: ColumnFilterProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  const normalizedOptions = React.useMemo(() => {
    return options.map((option) => {
      if (typeof option === 'string') {
        return { value: option, label: option }
      }
      return option
    })
  }, [options])

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return normalizedOptions
    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [normalizedOptions, searchQuery])

  const handleSelectionChange = (value: string, checked: boolean) => {
    const newSelection = checked ? [...selectedValues, value] : selectedValues.filter((v) => v !== value)

    onSelectionChange(column, newSelection)
  }

  const handleApplyFilter = () => {
    onFilter?.(column, selectedValues)
    setIsOpen(false)
  }

  const handleClearFilter = () => {
    onSelectionChange(column, [])
    onFilter?.(column, [])
  }

  const hasActiveFilters = selectedValues.length > 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed bg-transparent">
          <FilterIcon className="mr-2 h-4 w-4" />
          {title}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
              {selectedValues.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          {title}をフィルター
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleClearFilter}>
              クリア
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="p-2">
          <Input
            placeholder={`${title.toLowerCase()}を検索...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>

        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">読み込み中...</div>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">オプションが見つかりません</div>
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${column}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => handleSelectionChange(option.value, !!checked)}
                  />
                  <label htmlFor={`${column}-${option.value}`} className="text-sm font-normal cursor-pointer flex-1">
                    {option.label}
                  </label>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2 flex justify-between">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleApplyFilter} disabled={isLoading}>
            <CheckIcon className="mr-2 h-4 w-4" />
            適用
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
