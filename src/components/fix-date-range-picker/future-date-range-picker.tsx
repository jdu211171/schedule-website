'use client'

import React, { type FC, useState, useEffect, useRef, JSX } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ChevronUp, ChevronDown, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

export interface CompactDateRangePickerProps {
  /** Click handler for applying the updates */
  onUpdate?: (range: DateRange) => void
  /** Initial value for start date */
  initialDateFrom?: Date | string
  /** Initial value for end date */
  initialDateTo?: Date | string
  /** Alignment of popover */
  align?: 'start' | 'center' | 'end'
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Custom className */
  className?: string
}

const formatJapaneseDate = (date: Date): string => {
  return format(date, 'yyyy年M月d日', { locale: ja })
}

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map((part) => parseInt(part, 10))
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    return date
  } else {
    return dateInput
  }
}

interface Preset {
  name: string
  label: string
}

const COMPACT_PRESETS: Preset[] = [
  { name: 'next7', label: '次の7日間' },
  { name: 'next14', label: '次の14日間' },
  { name: 'next30', label: '次の30日間' },
  { name: 'nextWeek', label: '来週' },
  { name: 'nextMonth', label: '来月' },
  { name: 'next3Months', label: '次の3ヶ月間' }
]

/** Compact DateRangePicker with visible range selection */
export const CompactDateRangePicker: FC<CompactDateRangePickerProps> = ({
  initialDateFrom = new Date(),
  initialDateTo,
  onUpdate,
  align = 'start',
  placeholder = '期間を選択',
  disabled = false,
  className
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom),
    to: initialDateTo ? getDateAdjustedForTimezone(initialDateTo) : undefined
  })

  const openedRangeRef = useRef<DateRange | undefined>(undefined)
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

  // Get today's date for disabling past dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const disablePastDates = (date: Date) => {
    return date < today
  }

  const getPresetRange = (presetName: string): DateRange => {
    const preset = COMPACT_PRESETS.find(({ name }) => name === presetName)
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`)
    
    const from = new Date()
    const to = new Date()
    
    const getMonday = (date: Date) => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }

    switch (preset.name) {
      case 'next7':
        from.setHours(0, 0, 0, 0)
        to.setDate(to.getDate() + 6)
        to.setHours(23, 59, 59, 999)
        break
      case 'next14':
        from.setHours(0, 0, 0, 0)
        to.setDate(to.getDate() + 13)
        to.setHours(23, 59, 59, 999)
        break
      case 'next30':
        from.setHours(0, 0, 0, 0)
        to.setDate(to.getDate() + 29)
        to.setHours(23, 59, 59, 999)
        break
      case 'nextWeek':
        const nextMonday = getMonday(new Date())
        nextMonday.setDate(nextMonday.getDate() + 7)
        from.setTime(nextMonday.getTime())
        from.setHours(0, 0, 0, 0)
        
        to.setTime(nextMonday.getTime())
        to.setDate(to.getDate() + 6)
        to.setHours(23, 59, 59, 999)
        break
      case 'nextMonth':
        from.setMonth(from.getMonth() + 1)
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        
        to.setMonth(to.getMonth() + 2)
        to.setDate(0)
        to.setHours(23, 59, 59, 999)
        break
      case 'next3Months':
        from.setHours(0, 0, 0, 0)
        to.setMonth(to.getMonth() + 3)
        to.setHours(23, 59, 59, 999)
        break
    }

    return { from, to }
  }

  const setPreset = (preset: string): void => {
    const newRange = getPresetRange(preset)
    setRange(newRange)
    setSelectedPreset(preset)
  }

  const checkPreset = (): void => {
    for (const preset of COMPACT_PRESETS) {
      const presetRange = getPresetRange(preset.name)

      const normalizedRangeFrom = new Date(range.from!)
      normalizedRangeFrom.setHours(0, 0, 0, 0)
      const normalizedPresetFrom = new Date(presetRange.from!)
      normalizedPresetFrom.setHours(0, 0, 0, 0)

      const normalizedRangeTo = new Date(range.to ?? 0)
      normalizedRangeTo.setHours(0, 0, 0, 0)
      const normalizedPresetTo = new Date(presetRange.to ?? 0)
      normalizedPresetTo.setHours(0, 0, 0, 0)

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name)
        return
      }
    }

    setSelectedPreset(undefined)
  }

  const resetValues = (): void => {
    setRange({
      from: getDateAdjustedForTimezone(initialDateFrom),
      to: initialDateTo ? getDateAdjustedForTimezone(initialDateTo) : undefined
    })
  }

  useEffect(() => {
    checkPreset()
  }, [range])

  const PresetButton = ({
    preset,
    label,
    isSelected
  }: {
    preset: string
    label: string
    isSelected: boolean
  }): JSX.Element => (
    <Button
      className={cn(
        "justify-center text-center h-8 px-3 text-xs flex-1",
        isSelected && "bg-primary text-primary-foreground"
      )}
      variant={isSelected ? "default" : "outline"}
      onClick={() => setPreset(preset)}
      size="sm"
    >
      {label}
    </Button>
  )

  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b
    return (
      a.from?.getTime() === b.from?.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    )
  }

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = { ...range }
    }
  }, [isOpen])

  const handleOpenChange = (open: boolean) => {
    if (disabled) return
    if (!open) {
      resetValues()
    }
    setIsOpen(open)
  }

  const handleCalendarSelect = (selectedRange: DateRange | undefined) => {
    if (selectedRange?.from) {
      setRange(selectedRange)
      // Auto-close when both dates are selected
      if (selectedRange.from && selectedRange.to) {
        setTimeout(() => {
          setIsOpen(false)
          if (!areRangesEqual(selectedRange, openedRangeRef.current)) {
            onUpdate?.(selectedRange)
          }
        }, 200)
      }
    }
  }

  // Create modifiers for range styling
  const modifiers = {
    range: (date: Date) => {
      if (!range.from || !range.to) return false
      const time = date.getTime()
      return time >= range.from.getTime() && time <= range.to.getTime()
    },
    rangeStart: (date: Date) => {
      return range.from ? date.getTime() === range.from.getTime() : false
    },
    rangeEnd: (date: Date) => {
      return range.to ? date.getTime() === range.to.getTime() : false
    },
    rangeMiddle: (date: Date) => {
      if (!range.from || !range.to) return false
      const time = date.getTime()
      return time > range.from.getTime() && time < range.to.getTime()
    }
  }

  const modifiersClassNames = {
    range: "bg-primary/20 text-foreground",
    rangeStart: "bg-primary text-primary-foreground rounded-l-md rounded-r-none",
    rangeEnd: "bg-primary text-primary-foreground rounded-r-md rounded-l-none", 
    rangeMiddle: "bg-primary/20 text-foreground rounded-none"
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger asChild>
        <Button 
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal min-h-[40px]",
            !range.from && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <div className="text-left flex-1">
            {range.from ? (
              range.to ? (
                `${formatJapaneseDate(range.from)} - ${formatJapaneseDate(range.to)}`
              ) : (
                formatJapaneseDate(range.from)
              )
            ) : (
              placeholder
            )}
          </div>
          <div className="pl-1 opacity-60">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <div className="p-3">
          {/* Presets above calendar */}
          <div className="mb-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              プリセット
            </div>
            <div className="flex flex-wrap gap-2">
              {COMPACT_PRESETS.map((preset) => (
                <PresetButton
                  key={preset.name}
                  preset={preset.name}
                  label={preset.label}
                  isSelected={selectedPreset === preset.name}
                />
              ))}
            </div>
          </div>
          
          {/* Calendar */}
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            defaultMonth={range.from || today}
            locale={ja}
            disabled={disablePastDates}
            showOutsideDays={false}
            className="rounded-md"
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            classNames={{
              months: "flex flex-col sm:flex-row gap-2",
              month: "flex flex-col gap-4",
              caption: "flex justify-center pt-1 relative items-center w-full",
              caption_label: "text-sm font-medium",
              nav: "flex items-center gap-1",
              nav_button: cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium",
                "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                "hover:bg-accent hover:text-accent-foreground",
                "disabled:pointer-events-none disabled:opacity-50"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-x-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
              day: cn(
                "inline-flex items-center justify-center rounded-md text-sm font-normal",
                "size-8 p-0 font-normal aria-selected:opacity-100",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50"
              ),
              day_selected: 
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-semibold",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-30 line-through",
              day_hidden: "invisible",
            }}
            formatters={{
              formatCaption: (date) => format(date, "yyyy年M月", { locale: ja }),
              formatWeekdayName: (date) => {
                const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
                return weekdays[date.getDay()];
              }
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-3 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {range.from && range.to ? (
              `${formatJapaneseDate(range.from)} - ${formatJapaneseDate(range.to)}`
            ) : range.from ? (
              formatJapaneseDate(range.from)
            ) : (
              "期間を選択してください"
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsOpen(false)
                resetValues()
              }}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsOpen(false)
                if (!areRangesEqual(range, openedRangeRef.current)) {
                  onUpdate?.(range)
                }
              }}
              disabled={!range.from || !range.to}
            >
              適用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

CompactDateRangePicker.displayName = 'CompactDateRangePicker'