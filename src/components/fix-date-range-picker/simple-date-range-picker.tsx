'use client'

import { useState, useEffect } from "react"
import { addDays, format, startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek, addWeeks, subMonths } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

interface SimpleDateRangePickerProps {
  value?: DateRange
  onValueChange?: (range: DateRange) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showPresets?: boolean
  disablePastDates?: boolean
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
  disablePastDates = true
}) => {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRange>(value || { from: undefined, to: undefined })
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

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

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue()
    setTempRange(range)
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range) {
      setTempRange(range)
      if (range.from && range.to) {
        setTimeout(() => {
          setOpen(false)
          onValueChange?.(range)
        }, 200)
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
    setCurrentMonth(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
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
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {formatDateRange(value || { from: undefined, to: undefined })}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-xl border" 
        align="start"
        sideOffset={4}
      >
        <div className="flex bg-background">
          <div className="p-4">
            <div className="flex items-center justify-center mb-4 gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-accent rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-base font-semibold min-w-[220px] text-center">
                {format(currentMonth, "M月 yyyy", { locale: ja })} - {format(addMonths(currentMonth, 1), "M月 yyyy", { locale: ja })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-accent rounded"
              >
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
                  "h-9 w-9 p-0 font-normal text-center relative z-10",
                  "hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                ),
                day_selected: 
                  "!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground !opacity-100 rounded-md z-20",
                day_today: "bg-accent text-accent-foreground font-medium",
                day_outside: "text-gray-400 hover:text-gray-500 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
                day_disabled: "text-muted-foreground opacity-30",
                day_range_start: "!bg-primary !text-primary-foreground rounded-l-md rounded-r-none z-20",
                day_range_end: "!bg-primary !text-primary-foreground rounded-r-md rounded-l-none z-20",
                day_range_middle: 
                  "!bg-muted/70 !text-foreground rounded-none hover:!bg-muted/80 z-10",
                day_hidden: "invisible",
              }}
              modifiers={{
                range_start: tempRange.from,
                range_end: tempRange.to,
                range_middle: tempRange.from && tempRange.to ? (date: Date) => {
                  if (!tempRange.from || !tempRange.to) return false
                  return date > tempRange.from && date < tempRange.to
                } : undefined,
              }}
              modifiersClassNames={{
                range_start: "!bg-primary !text-primary-foreground rounded-l-md rounded-r-none z-20",
                range_end: "!bg-primary !text-primary-foreground rounded-r-md rounded-l-none z-20", 
                range_middle: "!bg-muted/99 !text-foreground rounded-none hover:!bg-muted/1 z-10",
              }}
            />

            <div className="flex gap-2 mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-accent"
                onClick={handleClear}
              >
                クリア
              </Button>
              <Button
                variant="ghost"
                size="sm" 
                onClick={handleCancel}
              >
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

SimpleDateRangePicker.displayName = 'SimpleDateRangePicker'