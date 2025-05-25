import { Lesson } from "@/app/student/page";
import { cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import React from "react";

type MonthViewerProps = {
  lessons: Lesson[];
  monthDate: Date;
  daysOfWeek: string[];
  setViewType: React.Dispatch<React.SetStateAction<"WEEK" | "MONTH">>;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  getColor: (subjectId: string) => string;
};

export const StudentScheduleMonthViewer: React.FC<MonthViewerProps> = ({
  lessons,
  monthDate,
  daysOfWeek,
  setViewType,
  setCurrentDate,
  getColor,
}) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 text-center mb-1 font-semibold">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, ind) => {
          const dayLessons = lessons.filter((l) =>
            isSameDay(parseISO(l.date), day)
          );
          const isCurrentDay = isToday(day);

          return (
            <div
              key={ind}
              className={cn(
                "border rounded p-1 min-h-[80px] hover:bg-gray-100 dark:hover:bg-[#1c1c1c] cursor-pointer",
                isCurrentDay
                  ? "bg-blue-100 border-blue-400 hover:bg-blue-200"
                  : ""
              )}
              onClick={() => {
                setCurrentDate(day);
                setViewType("WEEK");
              }}
            >
              <div className={cn(`text-xs font-bold`, isCurrentDay ? "" : "")}>
                {format(day, "d")}
              </div>
              {dayLessons.map((lesson, idx) => {
                const bgColor = getColor(lesson.subject.subjectId);
                return (
                  <div
                    key={idx}
                    style={{ backgroundColor: bgColor }}
                    className="text-xs rounded px-1 mt-1"
                  >
                    {lesson.subject.name}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
