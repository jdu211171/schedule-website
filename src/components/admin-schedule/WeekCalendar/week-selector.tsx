"use client";

import { cn } from "@/lib/utils";
import {
  addWeeks,
  startOfWeek,
  format,
  addDays,
  isSameDay,
  startOfDay,
  addMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import React, { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { getCurrentDateAdjusted, getDateKey, isSameDayDate } from "../date";

type WeekSelectorProps = {
  selectedWeeks: Date[];
  onSelectWeek: (startDate: Date, isSelected: boolean) => void;
  baseDate?: Date; // NEW: Base date for week calculation
  onBaseDateChange?: (date: Date) => void; // NEW: Handler for base date change
};

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeeks,
  onSelectWeek,
  baseDate,
  onBaseDateChange,
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Use provided baseDate or default to current date
  const currentBaseDate = baseDate || getCurrentDateAdjusted();

  const today = useMemo(() => {
    return startOfDay(getCurrentDateAdjusted());
  }, []);

  const maxDate = useMemo(() => {
    return addMonths(today, 3);
  }, [today]);

  // Generate 5 weeks starting from base date
  const weeksOfMonth: Date[] = useMemo(
    () => [
      currentBaseDate,
      addWeeks(currentBaseDate, 1),
      addWeeks(currentBaseDate, 2),
      addWeeks(currentBaseDate, 3),
      addWeeks(currentBaseDate, 4),
    ],
    [currentBaseDate]
  );

  const isWeekSelected = (weekStartDate: Date): boolean => {
    const currentWeekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    return selectedWeeks.some((selectedDate) => {
      const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return isSameDayDate(selectedWeekStart, currentWeekStart);
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onBaseDateChange) {
      // Set to start of week (Monday)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      onBaseDateChange(weekStart);
      setCalendarOpen(false);
    }
  };

  const handleTodayClick = () => {
    if (onBaseDateChange) {
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      onBaseDateChange(todayWeekStart);
      setCalendarOpen(false);
    }
  };

  const isViewingCurrentWeek = useMemo(() => {
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const baseWeekStart = startOfWeek(currentBaseDate, { weekStartsOn: 1 });
    return isSameDay(currentWeekStart, baseWeekStart);
  }, [today, currentBaseDate]);

  // Get week range display
  const weekRangeDisplay = useMemo(() => {
    const weekStart = startOfWeek(currentBaseDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, "M月d日", { locale: ja })} - ${format(weekEnd, "M月d日", { locale: ja })}`;
  }, [currentBaseDate]);

  const lastWeekEnd = useMemo(() => {
    const lastWeek = weeksOfMonth[weeksOfMonth.length - 1];
    const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
    return addDays(weekStart, 6);
  }, [weeksOfMonth]);

  const fullRangeDisplay = useMemo(() => {
    const firstWeekStart = startOfWeek(weeksOfMonth[0], { weekStartsOn: 1 });
    return `${format(firstWeekStart, "M月d日", { locale: ja })} - ${format(lastWeekEnd, "M月d日", { locale: ja })}`;
  }, [weeksOfMonth, lastWeekEnd]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Date Range Selector */}
      {onBaseDateChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">期間:</span>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 px-3 text-xs font-normal")}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {fullRangeDisplay}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
              <Calendar
                mode="single"
                selected={currentBaseDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < today || date > maxDate}
                initialFocus
                locale={ja}
                numberOfMonths={2}
                showOutsideDays={true}
                modifiers={{
                  range: (date) => {
                    // Highlight the 5-week range
                    const firstWeekStart = startOfWeek(currentBaseDate, {
                      weekStartsOn: 1,
                    });
                    return date >= firstWeekStart && date <= lastWeekEnd;
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
                  disabled={isViewingCurrentWeek}
                >
                  今週
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {!isViewingCurrentWeek && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={handleTodayClick}
            >
              今週に戻る
            </Button>
          )}
        </div>
      )}

      {/* Week Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          表示する週間:
        </span>

        <div className="flex space-x-2">
          {weeksOfMonth.map((weekStartDate, index) => {
            const isSelected = isWeekSelected(weekStartDate);
            const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
            const weekEnd = addDays(weekStart, 6);
            const weekDisplay = `${format(weekStart, "M/d", { locale: ja })}-${format(weekEnd, "M/d", { locale: ja })}`;

            return (
              <label
                key={getDateKey(weekStartDate)}
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground ring-2 ring-primary"
                    : index === 0
                      ? "bg-secondary text-secondary-foreground border border-input"
                      : "bg-background text-foreground border border-input",
                  index === 0 && "font-bold",
                  "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                )}
                title={`第${index + 1}週: ${weekDisplay}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected}
                  onChange={(e) =>
                    onSelectWeek(weekStartDate, e.target.checked)
                  }
                />
                {index + 1}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
