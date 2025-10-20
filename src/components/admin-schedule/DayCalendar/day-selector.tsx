"use client";

import type React from "react";
import { useMemo, useState } from "react";
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  startOfWeek,
  isSameWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type DaySelectorProps = {
  startDate: Date;
  selectedDays: Date[];
  onSelectDay: (date: Date, isSelected: boolean) => void;
  onStartDateChange: (date: Date) => void;
};

const getDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const japaneseWeekdays = ["日", "月", "火", "水", "木", "金", "土"];

export const DaySelector: React.FC<DaySelectorProps> = ({
  startDate,
  selectedDays,
  onSelectDay,
  onStartDateChange,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = useMemo(() => {
    const date = new Date();
    return startOfDay(date);
  }, []);

  const currentWeekStart = useMemo(
    () => startOfWeek(today, { weekStartsOn: 1 }),
    [today]
  );

  // Allow selecting any date in history or future without restriction

  const displayDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  }, [startDate]);

  // Создаем DateRange для календаря
  const dateRange = useMemo(
    (): DateRange => ({
      from: startDate,
      to: addDays(startDate, 6),
    }),
    [startDate]
  );

  const isDaySelected = (date: Date) => {
    return selectedDays.some((selectedDate) => isSameDay(selectedDate, date));
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    // При любом клике всегда берем первую дату из range и делаем её стартовой
    if (range?.from) {
      onStartDateChange(range.from);
      setCalendarOpen(false);
    }
    // Если пользователь кликнул на уже выбранную дату (range будет undefined)
    // или если это второй клик в стандартном range picker
    else if (range === undefined) {
      // В этом случае мы не делаем ничего, ждем следующий клик
    }
  };

  const handleTodayClick = () => {
    // Focus current day (parent will anchor week to Monday and select today)
    onStartDateChange(today);
    setCalendarOpen(false);
  };

  // Disable/Hide controls if the current startDate is already in this week
  const isViewingCurrentWeek = isSameWeek(startDate, today, {
    weekStartsOn: 1,
  });

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        {/* <span className="text-sm font-medium text-foreground">表示期間:</span> */}

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {format(startDate, "M月d日", { locale: ja })} -{" "}
              {format(addDays(startDate, 6), "M月d日", { locale: ja })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                if (date) {
                  onStartDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
              locale={ja}
              numberOfMonths={2}
              showOutsideDays={true}
              modifiers={{
                range: (date) => {
                  const daysDiff = Math.floor(
                    (date.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return daysDiff >= 0 && daysDiff <= 6;
                },
              }}
              modifiersClassNames={{
                range: "bg-primary/20 text-foreground",
              }}
            />
            <div className="p-3 border-t">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleTodayClick}
                // Always allow jumping to today to re-focus selection
                disabled={false}
              >
                今日
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={handleTodayClick}
        >
          今日に戻る
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* <span className="text-sm font-medium text-foreground">選択日:</span> */}

        <div className="flex space-x-1">
          {displayDays.map((date, index) => {
            const isToday = isSameDay(date, today);
            const isSelected = isDaySelected(date);
            const dayNumber = date.getDate();
            const monthName = format(date, "M月", { locale: ja });
            const dayOfWeek = japaneseWeekdays[date.getDay()];

            return (
              <label
                key={getDateKey(date)}
                className={cn(
                  "relative inline-flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors cursor-pointer",
                  !isSelected && "hover:bg-accent hover:text-accent-foreground",
                  isSelected &&
                    "bg-primary text-primary-foreground ring-2 ring-primary hover:bg-primary/90",
                  !isSelected &&
                    isToday &&
                    "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700",
                  !isSelected &&
                    !isToday &&
                    "bg-background text-foreground border border-input"
                )}
                title={format(date, "yyyy年M月d日（E）", { locale: ja })}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected}
                  onChange={(e) => onSelectDay(date, e.target.checked)}
                />
                <span className="text-sm font-medium leading-none">
                  {dayNumber}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {dayOfWeek}
                </span>

                {date.getDate() === 1 && (
                  <span className="absolute -top-1 -right-1 text-[8px] px-1 bg-muted text-muted-foreground rounded">
                    {monthName}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
