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
    label: "1週間",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addDays(startDate, 7),
    }),
  },
  {
    label: "1ヶ月",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 1),
    }),
  },
  {
    label: "3ヶ月",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 3),
    }),
  },
  {
    label: "6ヶ月",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 6),
    }),
  },
  {
    label: "1年",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 12),
    }),
  },
  {
    label: "2年",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 24),
    }),
  },
  {
    label: "3年",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 36),
    }),
  },
  {
    label: "5年",
    getValue: (startDate: Date) => ({
      from: startDate,
      to: addMonths(startDate, 60),
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

  // Helper: normalize a Date to local noon to avoid timezone day shifts
  const toLocalNoon = React.useCallback((d: Date | undefined) => {
    if (!d) return undefined
    const nd = new Date(d)
    nd.setHours(12, 0, 0, 0)
    return nd
  }, [])

  // Update temp range when value changes
  React.useEffect(() => {
    if (!value) {
      setTempRange(undefined)
      return
    }
    setTempRange({
      from: toLocalNoon(value.from!),
      to: toLocalNoon(value.to),
    })
  }, [value, toLocalNoon])

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
      return `${format(range.from, "yyyy/M/d", { locale: ja })} - ${format(range.to, "yyyy/M/d", { locale: ja })}`
    }
  }

  // Handle date selection - work with temp range
  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      setTempRange(undefined)
      return
    }
    setTempRange({ from: toLocalNoon(range.from!), to: toLocalNoon(range.to) })
  }

  // Handle preset selection - work with temp range
  const handlePresetClick = (preset: typeof presets[0]) => {
    if (!tempRange?.from) return // Require start date first
    
    const range = preset.getValue(tempRange.from)
    setTempRange({ from: toLocalNoon(range.from)!, to: toLocalNoon(range.to) })
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
    if (!tempRange) {
      onValueChange?.(undefined)
      return
    }
    const normalized: DateRange = {
      from: toLocalNoon(tempRange.from!)!,
      to: toLocalNoon(tempRange.to),
    }
    onValueChange?.(normalized)
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
              <div className="flex flex-col p-2 gap-1 w-20">
                <div className="text-xs text-muted-foreground px-2 py-1 text-center">
                  {!tempRange?.from ? "開始日を選択" : "期間選択"}
                </div>
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className={cn(
                      "h-10 w-16 p-0 text-sm font-normal justify-center",
                      tempRange?.from 
                        ? "hover:bg-primary hover:text-primary-foreground" 
                        : "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handlePresetClick(preset)}
                    disabled={!tempRange?.from}
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
