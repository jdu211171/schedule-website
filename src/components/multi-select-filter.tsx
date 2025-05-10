"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type FilterOption = {
  value: string
  label: string
}

type MultiSelectFilterProps = {
  options: FilterOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder: string
  label?: string
  searchPlaceholder?: string
  emptySearchText?: string
  maxHeight?: number
  className?: string
}

export function MultiSelectFilter({
                                    options,
                                    selectedValues,
                                    onChange,
                                    placeholder,
                                    label,
                                    searchPlaceholder = "検索オプション...",
                                    emptySearchText = "オプションが見つかりません。",
                                    maxHeight = 300,
                                    className,
                                  }: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options

    const lowerQuery = searchQuery.toLowerCase()
    return options.filter(
      (option) => option.label.toLowerCase().includes(lowerQuery) || option.value.toLowerCase().includes(lowerQuery),
    )
  }, [options, searchQuery])

  const handleSelect = React.useCallback(
    (value: string) => {
      onChange(selectedValues.includes(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value])
    },
    [selectedValues, onChange],
  )

  const handleClear = React.useCallback(() => {
    onChange([])
    setSearchQuery("")
  }, [onChange])

  const handleRemoveValue = React.useCallback(
    (value: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(selectedValues.filter((v) => v !== value))
    },
    [selectedValues, onChange],
  )

  const selectedLabels = React.useMemo(() => {
    return selectedValues.map((value) => {
      const option = options.find((opt) => opt.value === value)
      return option?.label || value
    })
  }, [selectedValues, options])

  return (
    <div className={cn("space-y-1", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between min-h-10", selectedValues.length > 0 ? "h-auto" : "h-10")}
              onClick={() => setOpen(!open)}
            >
              <div className="flex flex-wrap gap-1 items-center">
                {selectedValues.length === 0 && (
                  <span className="text-muted-foreground flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    {placeholder}
                  </span>
                )}
                {selectedValues.length > 0 && <span className="sr-only">{selectedValues.length} items selected</span>}
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {/* Render badges outside the button but positioned over it */}
            {selectedValues.length > 0 && (
              <div
                className="absolute top-0 left-0 right-8 bottom-0 flex flex-wrap gap-1 p-2 overflow-hidden pointer-events-none"
                aria-hidden="true"
              >
                {selectedLabels.map((label, i) => (
                  <Badge key={`${label}-${i}`} variant="secondary" className="mr-1 mb-1 pointer-events-auto">
                    {label}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleRemoveValue(selectedValues[i], e as unknown as React.MouseEvent)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => handleRemoveValue(selectedValues[i], e)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            <CommandList className={cn("max-h-[300px]", maxHeight && `max-h-[${maxHeight}px]`)}>
              <CommandEmpty>{emptySearchText}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  return (
                    <CommandItem key={option.value} value={option.value} onSelect={() => handleSelect(option.value)}>
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {selectedValues.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={handleClear} className="justify-center text-center">
                      フィルターをクリア
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
