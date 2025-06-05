"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { format, addDays, isSameDay, startOfDay, addMonths } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type DaySelectorProps = {
  startDate: Date
  selectedDays: Date[]
  onSelectDay: (date: Date, isSelected: boolean) => void
  onStartDateChange: (date: Date) => void
}

const getDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0]
}

// Японские сокращения дней недели
const japaneseWeekdays = ["日", "月", "火", "水", "木", "金", "土"]

export const DaySelector: React.FC<DaySelectorProps> = ({
  startDate,
  selectedDays,
  onSelectDay,
  onStartDateChange,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false)

  const today = useMemo(() => {
    const date = new Date()
    return startOfDay(date)
  }, [])

  const maxDate = useMemo(() => {
    return addMonths(today, 3)
  }, [today])

  const displayDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i))
    }
    return days
  }, [startDate])

  const isDaySelected = (date: Date) => {
    return selectedDays.some((selectedDate) => isSameDay(selectedDate, date))
  }

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      onStartDateChange(date)
      setCalendarOpen(false)
    }
  }

  const handleTodayClick = () => {
    onStartDateChange(today)
    setCalendarOpen(false)
  }

  const isViewingToday = isSameDay(startDate, today)

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">表示期間:</span>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 px-3 text-xs font-normal", !startDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {format(startDate, "M月d日", { locale: ja })} - {format(addDays(startDate, 6), "M月d日", { locale: ja })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              disabled={(date) => date < today || date > maxDate}
              initialFocus
              locale={ja}
              modifiers={{
                // Подсвечиваем весь 7-дневный диапазон
                rangeStart: (date) => isSameDay(date, startDate),
                rangeMiddle: (date) => {
                  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  return daysDiff > 0 && daysDiff < 6
                },
                rangeEnd: (date) => isSameDay(date, addDays(startDate, 6)),
                // Выбранные дни в диапазоне
                selectedInRange: (date) => {
                  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  const isInRange = daysDiff >= 0 && daysDiff <= 6
                  return isInRange && isDaySelected(date)
                },
              }}
              modifiersStyles={{
                rangeStart: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  borderRadius: "6px 0 0 6px",
                  fontWeight: "bold",
                },
                rangeMiddle: {
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  color: "hsl(var(--foreground))",
                  borderRadius: "0",
                },
                rangeEnd: {
                  backgroundColor: "hsl(var(--primary) / 0.3)",
                  color: "hsl(var(--foreground))",
                  borderRadius: "0 6px 6px 0",
                  border: "1px solid hsl(var(--primary) / 0.5)",
                },
                selectedInRange: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  fontWeight: "bold",
                  border: "2px solid hsl(var(--primary))",
                },
              }}
            />
            <div className="p-3 border-t">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleTodayClick}
                disabled={isViewingToday}
              >
                今日
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {!isViewingToday && (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={handleTodayClick}>
            今日に戻る
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">選択日:</span>

        <div className="flex space-x-1">
          {displayDays.map((date, index) => {
            const isToday = isSameDay(date, today)
            const isSelected = isDaySelected(date)
            const dayNumber = date.getDate()
            const monthName = format(date, "M月", { locale: ja })
            const dayOfWeek = japaneseWeekdays[date.getDay()]

            return (
              <label
                key={getDateKey(date)}
                className={cn(
                  "relative inline-flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors cursor-pointer",
                  // Ховер только для невыбранных дней
                  !isSelected && "hover:bg-accent hover:text-accent-foreground",
                  // Выбранные дни - более насыщенный ховер
                  isSelected && "bg-primary text-primary-foreground ring-2 ring-primary hover:bg-primary/90",
                  !isSelected && isToday && "bg-yellow-50 text-yellow-800 border border-yellow-200",
                  !isSelected && !isToday && "bg-background text-foreground border border-input",
                )}
                title={format(date, "yyyy年M月d日（E）", { locale: ja })}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected}
                  onChange={(e) => onSelectDay(date, e.target.checked)}
                />
                <span className="text-sm font-medium leading-none">{dayNumber}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{dayOfWeek}</span>

                {/* Индикатор начала месяца */}
                {date.getDate() === 1 && (
                  <span className="absolute -top-1 -right-1 text-[8px] px-1 bg-muted text-muted-foreground rounded">
                    {monthName}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
