import React from "react";
import {
  format,
  startOfWeek,
  addHours,
  addDays,
  isSameDay,
  isSameHour,
  parseISO,
  isToday,
} from "date-fns";
import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";

type WeekViewerProps = {
  lessons: ExtendedClassSessionWithRelations[];
  weekDate: Date; // Haftaning istalgan kuni (odatda dushanba)
};

const daysOfWeek = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export const StudentScheduleWeekViewer: React.FC<WeekViewerProps> = ({
  lessons,
  weekDate,
}) => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-auto">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] text-sm font-semibold">
        <div></div>
        {days.map((day, i) => {
          const currentDay = isToday(day);
          return (
            <div
              key={i}
              className={`text-center px-2 py-1 ${
                currentDay ? "bg-blue-200 text-blue-800 font-bold" : ""
              }`}
            >
              {daysOfWeek[i]} <br />
              {format(day, "d")}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] ">
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Time column */}
            <div className="border text-xs h-[50px] flex items-center justify-center">
              {String(hour).padStart(2, "0")}:00
            </div>

            {/* 7 days x 1 hour cells */}
            {days.map((day, dayIndex) => {
              const cellDate = addHours(day, hour);
              const isCurrentDay = isToday(day);

              const lessonsInCell = lessons.filter(
                (l) =>
                  isSameDay(parseISO(l.date), cellDate) &&
                  isSameHour(parseISO(l.date), cellDate)
              );

              return (
                <div
                  key={dayIndex}
                  className={`border h-[50px] text-xs p-1 relative ${
                    isCurrentDay ? "bg-blue-200" : ""
                  }`}
                >
                  {lessonsInCell.map((lesson, i) => (
                    <div
                      key={i}
                      className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 rounded px-1 text-[10px] overflow-hidden truncate m-1"
                    >
                      {lesson.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
