"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subMonths,
  isToday,
} from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"

interface SimpleDateRangePickerProps {
  value?: DateRange
  onValueChange?: (range: DateRange) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showPresets?: boolean
  disablePastDates?: boolean
  autoClose?: boolean
}

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
  showPresets = true,
  disablePastDates = true,
  autoClose = false,
}) => {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange>(value || { from: undefined, to: undefined })
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined)
  const [isSelecting, setIsSelecting] = useState(false)

  useEffect(() => {
    setTempRange(value || { from: undefined, to: undefined })
  }, [value])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const disablePastDatesFunc = disablePastDates ? (date: Date) => date < today : undefined

  // More compact date formatting for better fit
  const formatDateRange = (range: DateRange) => {
    if (!range.from) return placeholder
    if (!range.to) return format(range.from, "M/d", { locale: ja })
    if (range.from.getTime() === range.to.getTime()) {
      return format(range.from, "M/d", { locale: ja })
    }

    // Check if dates are in the same year and month for more compact display
    const fromYear = range.from.getFullYear()
    const toYear = range.to.getFullYear()
    const fromMonth = range.from.getMonth()
    const toMonth = range.to.getMonth()

    if (fromYear === toYear && fromMonth === toMonth) {
      // Same month: "6/25 - 29"
      return `${format(range.from, "M/d", { locale: ja })} - ${format(range.to, "d", { locale: ja })}`
    } else if (fromYear === toYear) {
      // Same year: "6/25 - 7/24"
      return `${format(range.from, "M/d", { locale: ja })} - ${format(range.to, "M/d", { locale: ja })}`
    } else {
      // Different years: "6/25 - 7/24"
      return `${format(range.from, "M/d", { locale: ja })} - ${format(range.to, "M/d", { locale: ja })}`
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (disabled) return
    setOpen(isOpen)
    if (!isOpen) {
      setTempRange(value || { from: undefined, to: undefined })
    }
  }

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const range = preset.getValue()
    setTempRange(range)
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (isSelecting) return // Prevent double clicks

    setIsSelecting(true)
    setTimeout(() => setIsSelecting(false), 100)

    if (range) {
      // If only one date is selected (starting date)
      if (range.from && !range.to) {
        setTempRange({ from: range.from, to: undefined })
      }
      // If full range is selected
      else if (range.from && range.to) {
        // Check if dates are the same (single date state)
        if (range.from.getTime() === range.to.getTime()) {
          setTempRange({ from: range.from, to: undefined })
        } else {
          setTempRange(range)
          if (autoClose) {
            setTimeout(() => {
              setOpen(false)
              onValueChange?.(range)
            }, 300)
          }
        }
      }
    }
  }

  const handleClear = () => {
    const emptyRange = { from: undefined, to: undefined }
    setTempRange(emptyRange)
  }

  const handleApply = () => {
    setOpen(false)
    onValueChange?.(tempRange)
  }

  const handleCancel = () => {
    setTempRange(value || { from: undefined, to: undefined })
    setOpen(false)
  }

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

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
          <span className="truncate">{formatDateRange(value || { from: undefined, to: undefined })}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 shadow-xl border" align="start" sideOffset={4}>
        <div className="flex bg-background">
          <div className="p-4">
            <div className="flex items-center justify-center mb-4 gap-2">
              <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-accent rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-base font-semibold min-w-[220px] text-center">
                {format(currentMonth, "M月 yyyy", { locale: ja })} -{" "}
                {format(addMonths(currentMonth, 1), "M月 yyyy", { locale: ja })}
              </span>
              <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-accent rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Calendar
              initialFocus
              mode="range"
              month={currentMonth}
              selected={tempRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={ja}
              disabled={disablePastDatesFunc}
              showOutsideDays={true}
              className="rounded-md"
              onDayMouseEnter={(date) => setHoveredDate(date)}
              onDayMouseLeave={() => setHoveredDate(undefined)}
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "hidden",
                caption_label: "hidden",
                nav: "hidden",
                nav_button: "hidden",
                nav_button_previous: "hidden",
                nav_button_next: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-xs",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day: cn(
                  "h-9 w-9 p-0 font-normal text-center relative z-10 transition-all duration-150",
                  "hover:bg-accent hover:text-accent-foreground rounded-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                ),
                // Simplified today styling - FIXED
                day_today: "bg-blue-100 text-blue-900 font-semibold border-2 border-blue-500 rounded-md",
                day_selected:
                  "!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground !opacity-100 rounded-md z-20 transform scale-105 transition-transform duration-150",
                day_outside:
                  "text-muted-foreground/30 bg-gray-50/50 border border-gray-200/50 rounded-md opacity-40 hover:text-muted-foreground/50 hover:bg-gray-100/50 hover:opacity-60 transition-all duration-200 aria-selected:bg-accent/30 aria-selected:text-muted-foreground/60",
                day_disabled:
                  "text-muted-foreground/30 opacity-20 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground/30",
                day_range_start:
                  "!bg-primary !text-primary-foreground rounded-md z-20 transform scale-105 transition-all duration-200 shadow-sm",
                day_range_end:
                  "!bg-primary !text-primary-foreground rounded-md z-20 transform scale-105 transition-all duration-200 shadow-sm",
                day_range_middle:
                  "!bg-primary/15 !text-foreground rounded-none hover:!bg-primary/25 z-10 transition-colors duration-200",
                day_hidden: "invisible",
              }}
              modifiers={{
                // Explicitly add today modifier - FIXED
                today: (date: Date) => isToday(date),
                // NEW: Past dates visual indicator
                past_date: (date: Date) => {
                  const dateOnly = new Date(date)
                  dateOnly.setHours(0, 0, 0, 0)
                  return dateOnly < today
                },
                // NEW: Dates from adjacent months - ONLY for non-past dates
                adjacent_month: (date: Date) => {
                  const dateYear = date.getFullYear()
                  const dateMonth = date.getMonth()
                  
                  // First check if date is NOT past
                  const dateOnly = new Date(date)
                  dateOnly.setHours(0, 0, 0, 0)
                  const isPastDate = dateOnly < today
                  
                  // If it's a past date, don't apply adjacent_month styling
                  if (isPastDate) return false
                  
                  const currentYear = currentMonth.getFullYear()
                  const currentDisplayMonth = currentMonth.getMonth()
                  const nextMonth = addMonths(currentMonth, 1)
                  const nextYear = nextMonth.getFullYear()
                  const nextDisplayMonth = nextMonth.getMonth()
                  
                  // Return true if date is NOT in either of the two main displayed months
                  const isNotInCurrentMonth = !(dateYear === currentYear && dateMonth === currentDisplayMonth)
                  const isNotInNextMonth = !(dateYear === nextYear && dateMonth === nextDisplayMonth)
                  
                  return isNotInCurrentMonth && isNotInNextMonth
                },
                // NEW: First date selected, waiting for second date - ANIMATED
                waiting_for_end: tempRange.from && !tempRange.to ? tempRange.from : undefined,
                range_start: tempRange.from && tempRange.to && tempRange.from?.getTime() !== tempRange.to?.getTime() ? tempRange.from : undefined,
                range_end:
                  tempRange.to && tempRange.from?.getTime() !== tempRange.to?.getTime() ? tempRange.to : undefined,
                range_middle:
                  tempRange.from && tempRange.to && tempRange.from.getTime() !== tempRange.to.getTime()
                    ? (date: Date) => {
                        if (!tempRange.from || !tempRange.to) return false
                        return date > tempRange.from && date < tempRange.to
                      }
                    : undefined,
                single_selected:
                  tempRange.from && tempRange.to && tempRange.from.getTime() === tempRange.to.getTime()
                    ? tempRange.from
                    : undefined,
                hover_range:
                  tempRange.from && !tempRange.to && hoveredDate && hoveredDate.getTime() !== tempRange.from.getTime()
                    ? (date: Date) => {
                        if (!tempRange.from || !hoveredDate) return false
                        const start = tempRange.from < hoveredDate ? tempRange.from : hoveredDate
                        const end = tempRange.from < hoveredDate ? hoveredDate : tempRange.from
                        return date >= start && date <= end
                      }
                    : undefined,
              }}
              modifiersClassNames={{
                // Explicit today styling - FIXED
                today: "bg-blue-100 text-blue-900 font-semibold border-2 border-blue-500 rounded-md",
                // NEW: Past dates styling - clearly distinguishable
                past_date: "bg-gray-50 text-gray-300 line-through opacity-50 cursor-not-allowed hover:bg-gray-50 hover:text-gray-300 pointer-events-none",
                // NEW: Adjacent month dates styling - dotted border and muted appearance
                adjacent_month: "text-gray-400 bg-gray-50/40 border border-dotted border-gray-300 rounded-md opacity-40 hover:opacity-60 hover:bg-gray-100/60 transition-all duration-200 text-xs font-light",
                // NEW: Animated state for first selected date - PULSING
                waiting_for_end: "!bg-primary !text-primary-foreground rounded-md z-20 transform scale-105 shadow-lg animate-pulse ring-2 ring-primary/50 ring-offset-2",
                range_start: "!bg-primary !text-primary-foreground rounded-md z-20 transform scale-105 shadow-sm",
                range_end: "!bg-primary !text-primary-foreground rounded-md z-20 transform scale-105 shadow-sm",
                range_middle: "!bg-primary/15 !text-foreground rounded-none hover:!bg-primary/25 z-10",
                single_selected:
                  "!bg-primary !text-primary-foreground rounded-md z-20 ring-2 ring-primary/30 ring-offset-1",
                hover_range: "!bg-primary/10 !text-foreground rounded-none z-5 transition-colors duration-200",
                hover_start:
                  "!bg-primary/30 !text-foreground rounded-l-md rounded-r-none z-10 transition-colors duration-200",
                hover_end:
                  "!bg-primary/30 !text-foreground rounded-r-md rounded-l-none z-10 transition-colors duration-200",
              }}
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
                disabled={!tempRange.from}
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