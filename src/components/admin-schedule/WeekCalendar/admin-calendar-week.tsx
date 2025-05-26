import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import React, { useCallback, useEffect, useState } from "react";
import { getCurrentDateAdjusted } from "../date";
import CalendarWeek from "./calendar-week";
import { WeekSelector } from "./week-selector";

// Storage key for selected weeks persistence
const SELECTED_WEEKS_KEY = "admin_calendar_selected_weeks";

type AdminCalendarWeekProps = {
  currentDate?: Date;
  mode?: "view" | "create";
  onLessonSelect?: (lesson: ExtendedClassSessionWithRelations) => void;
};

// Helper function to get a date key for comparison
const getDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const AdminCalendarWeek: React.FC<AdminCalendarWeekProps> = ({
  currentDate = new Date(),
  mode = "view",
  onLessonSelect,
}) => {
  // State for selected weeks - will be properly initialized after mount
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>(() => {
    // Create current date
    const today = getCurrentDateAdjusted();
    const todayDateKey = getDateKey(today);

    // Try to get saved weeks from localStorage during initial render
    if (typeof window !== "undefined") {
      const savedWeeksJson = localStorage.getItem(SELECTED_WEEKS_KEY);
      if (savedWeeksJson) {
        try {
          const savedWeeks = JSON.parse(savedWeeksJson);
          if (Array.isArray(savedWeeks) && savedWeeks.length > 0) {
            const parsedDates = savedWeeks
              .map((dateStr: string) => new Date(dateStr))
              .filter((date: Date) => !isNaN(date.getTime()));

            // Filter to only include dates from today onwards
            const validDates = parsedDates.filter((date) => {
              const dateKey = getDateKey(date);
              return dateKey >= todayDateKey;
            });

            if (validDates.length > 0) {
              return validDates;
            }
          }
        } catch (error) {
          console.error("Error parsing saved selected weeks:", error);
        }
      }
    }

    // Default to current date if no saved weeks or all saved weeks are in the past
    return [today];
  });

  // Clean up old dates from localStorage on mount
  useEffect(() => {
    const today = getCurrentDateAdjusted();
    const todayDateKey = getDateKey(today);

    const savedWeeksJson = localStorage.getItem(SELECTED_WEEKS_KEY);
    if (savedWeeksJson) {
      try {
        const savedWeeks = JSON.parse(savedWeeksJson);
        if (Array.isArray(savedWeeks) && savedWeeks.length > 0) {
          const validDates = savedWeeks.filter((dateStr: string) => {
            const date = new Date(dateStr);
            return !isNaN(date.getTime()) && getDateKey(date) >= todayDateKey;
          });

          // Update localStorage if we filtered out old dates
          if (validDates.length !== savedWeeks.length) {
            if (validDates.length > 0) {
              localStorage.setItem(
                SELECTED_WEEKS_KEY,
                JSON.stringify(validDates)
              );
            } else {
              localStorage.removeItem(SELECTED_WEEKS_KEY);
            }
          }
        }
      } catch (error) {
        console.error("Error cleaning up old dates:", error);
        localStorage.removeItem(SELECTED_WEEKS_KEY);
      }
    }
  }, []);
  const handleDaySelect = useCallback((date: Date, isSelected: boolean) => {
    setSelectedWeeks((prev) => {
      let newWeeks: Date[];
      if (isSelected) {
        // Add the week if not already selected
        const weekAlreadySelected = prev.some(
          (existingDate) => existingDate.getTime() === date.getTime()
        );

        if (weekAlreadySelected) return prev;

        newWeeks = [...prev, date];
        newWeeks = newWeeks.sort((a, b) => a.getTime() - b.getTime());
      } else {
        // Remove the week
        newWeeks = prev.filter((d) => d.getTime() !== date.getTime());
      }

      // Save to localStorage only if there are selected weeks
      if (newWeeks.length > 0) {
        localStorage.setItem(
          SELECTED_WEEKS_KEY,
          JSON.stringify(newWeeks.map((d) => d.toISOString()))
        );
      } else {
        localStorage.removeItem(SELECTED_WEEKS_KEY);
      }

      return newWeeks;
    });
  }, []);

  return (
    <div className="w-full flex flex-col gap-2 my-2">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:space-y-0 mx-5">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground"></h2>
        <WeekSelector
          selectedWeeks={selectedWeeks}
          onSelectWeek={handleDaySelect}
        />
      </div>

      <CalendarWeek
        selectedWeeks={selectedWeeks}
        onLessonSelect={onLessonSelect}
      />
    </div>
  );
};

export default AdminCalendarWeek;
