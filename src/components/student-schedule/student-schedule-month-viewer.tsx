import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { uz } from "date-fns/locale";

type Lesson = {
  name: string;
  date: string; // "2025-05-06"
};

type MonthViewerProps = {
  lessons: Lesson[];
  monthDate: Date;
  setViewType: React.Dispatch<React.SetStateAction<"DAY" | "WEEK" | "MONTH">>;
};

const daysOfWeek = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
export const StudentScheduleMonthViewer: React.FC<MonthViewerProps> = ({
  lessons,
  monthDate,
  setViewType,
}) => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 text-center font-medium mb-1">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, ind) => {
          const dayLessons = lessons.filter((l) =>
            isSameDay(parseISO(l.date), day)
          );

          return (
            <div
              key={ind}
              className="border rounded p-1 min-h-[80px] hover:bg-gray-100 dark:hover:bg-[#1c1c1c] cursor-pointer"
              onClick={(e) => {
                console.log(e);
              }}
            >
              <div className="text-xs font-bold">{format(day, "d")}</div>
              {dayLessons.map((lesson, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-blue-100 text-blue-700 rounded px-1 mt-1"
                >
                  {lesson.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
