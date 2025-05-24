import React, { useState } from "react";
import { getCurrentDateAdjusted } from "../date";
import CalendarWeek from "./calendar-week";
import { WeekSelector } from "./week-selector";
import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";

type AdminCalendarWeekProps = {
  currentDate?: Date;
  mode?: "view" | "create";
  onLessonSelect?: (lesson: ExtendedClassSessionWithRelations) => void;
};

const AdminCalendarWeek: React.FC<AdminCalendarWeekProps> = ({
  currentDate = new Date(),
  mode = "view",
  onLessonSelect,
}) => {
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>([
    getCurrentDateAdjusted(),
  ]);

  const handleDaySelect = (date: Date, isSelected: boolean) => {
    setSelectedWeeks((prev) => {
      if (isSelected) {
        // Add the week if not already selected
        const weekAlreadySelected = prev.some(
          (existingDate) => 
            existingDate.getTime() === date.getTime()
        );
        
        if (weekAlreadySelected) return prev;
        
        const newWeeks = [...prev, date];
        return newWeeks.sort((a, b) => a.getTime() - b.getTime());
      } else {
        // Remove the week
        return prev.filter((d) => d.getTime() !== date.getTime());
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-2 my-2">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:space-y-0 mx-5">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">
          スケジュール閲覧
        </h2>
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