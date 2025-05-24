import { cn } from "@/lib/utils";
import { addWeeks, startOfWeek } from "date-fns";
import React from "react";
import { getCurrentDateAdjusted, getDateKey, isSameDayDate } from "../date";

type WeekSelectorProps = {
  selectedWeeks: Date[];
  onSelectWeek: (startDate: Date, isSelected: boolean) => void;
};

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeeks,
  onSelectWeek,
}) => {
  const weeksOfMonth: Date[] = [
    getCurrentDateAdjusted(),
    addWeeks(getCurrentDateAdjusted(), 1),
    addWeeks(getCurrentDateAdjusted(), 2),
    addWeeks(getCurrentDateAdjusted(), 3),
    addWeeks(getCurrentDateAdjusted(), 4),
  ];

  const isWeekSelected = (weekStartDate: Date): boolean => {
    const currentWeekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    return selectedWeeks.some((selectedDate) => {
      const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return isSameDayDate(selectedWeekStart, currentWeekStart);
    });
  };

  return (
    <div className="flex space-x-2 items-center">
      <span className="text-sm font-medium text-foreground">表示する週間:</span>

      {weeksOfMonth.map((weekStartDate, index) => {
        const isSelected = isWeekSelected(weekStartDate);
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
            title={`Week of ${getDateKey(weekStartDate)}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              onChange={(e) => onSelectWeek(weekStartDate, e.target.checked)}
            />
            {index + 1}
          </label>
        );
      })}
    </div>
  );
};
