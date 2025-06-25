"use client"
import * as React from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  addDays,
} from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SimpleDateRangePickerProps {
  value?: DateRange
  onValueChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  disablePastDates?: boolean
  showPresets?: boolean
}

// Preset configurations
const presets = [
  {
    label: "今週",
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: "来週",
    getValue: () => ({
      from: startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
      to: endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
    }),
  },
  {
    label: "7日",
    getValue: () => ({
      from: addDays(new Date(), 1),
      to: addDays(new Date(), 7),
    }),
  },
  {
    label: "30日",
    getValue: () => ({
      from: addDays(new Date(), 1),
      to: addDays(new Date(), 30),
    }),
  },
  {
    label: "来月",
    getValue: () => ({
      from: startOfMonth(addMonths(new Date(), 1)),
      to: endOfMonth(addMonths(new Date(), 1)),
    }),
  },
]

export const SimpleDateRangePicker: React.FC<SimpleDateRangePickerProps> = ({
  value,
  onValueChange,
  placeholder = "期間を選択してください",
  disabled = false,
  className,
  disablePastDates = true,
  showPresets = true,
}) => {
  const [open, setOpen] = React.useState(false)
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value)

  // Update temp range when value changes
  React.useEffect(() => {
    setTempRange(value)
  }, [value])

  // Format the selected date range for display
  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder
    if (!range.to) return format(range.from, "M/d", { locale: ja })
    
    if (range.from.getTime() === range.to.getTime()) {
      return format(range.from, "M/d", { locale: ja })
    }

    const fromYear = range.from.getFullYear()
    const toYear = range.to.getFullYear()
    const fromMonth = range.from.getMonth()
    const toMonth = range.to.getMonth()

    if (fromYear === toYear && fromMonth === toMonth) {
      return `${format(range.from, "M/d", { locale: ja })} - ${format(range.to, "d", { locale: ja })}`
    } else if (fromYear === toYear) {
      return `${format(range.from, "M/d", { locale: ja })} - ${format(range.to, "M/d", { locale: ja })}`
    } else {
      return `${format(range.from, "M/d", { locale: ja })} - ${format(range.to, "M/d", { locale: ja })}`
    }
  }

  // Handle date selection - work with temp range
  const handleSelect = (range: DateRange | undefined) => {
    setTempRange(range)
  }

  // Handle preset selection - work with temp range
  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue()
    setTempRange(range)
  }

  // Handle popover open/close
  const handleOpenChange = (isOpen: boolean) => {
    if (disabled) return
    setOpen(isOpen)
    if (!isOpen) {
      // Reset temp range when closing without applying
      setTempRange(value)
    }
  }

  // Handle clear button
  const handleClear = () => {
    setTempRange(undefined)
  }

  // Handle apply button
  const handleApply = () => {
    setOpen(false)
    onValueChange?.(tempRange)
  }

  // Handle cancel button
  const handleCancel = () => {
    setTempRange(value)
    setOpen(false)
  }

  // Disable past dates function
  const disablePastDatesFunc = disablePastDates 
    ? (date: Date) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
      }
    : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-h-[40px] text-sm",
            !value?.from && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{formatDateRange(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex bg-background">
          <div className="p-4">
            <Calendar
              mode="range"
              defaultMonth={tempRange?.from || value?.from}
              selected={tempRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ja}
              disabled={disablePastDatesFunc}
              className="rounded-lg border-0"
            />

            <div className="flex gap-2 mt-4 pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="hover:bg-accent" onClick={handleClear}>
                クリア
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={handleApply}
                disabled={!tempRange?.from}
              >
                適用
              </Button>
            </div>
          </div>

          {showPresets && (
            <div className="border-l border-border bg-muted/30">
              <div className="flex flex-col p-2 gap-1 w-16">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="h-10 w-12 p-0 text-sm hover:bg-primary hover:text-primary-foreground font-normal justify-center"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

SimpleDateRangePicker.displayName = "SimpleDateRangePicker"