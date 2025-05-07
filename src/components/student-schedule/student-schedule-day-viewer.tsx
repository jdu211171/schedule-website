import React from "react";
import { format, isSameDay, isSameHour, parseISO, addHours } from "date-fns";

type Lesson = {
  name: string;
  date: string; // Masalan: "2025-05-07T14:00:00"
};

type DayViewerProps = {
  lessons: Lesson[];
  date: Date; // Masalan: new Date(2025, 4, 7)
};

export const StudentScheduleDayViewer: React.FC<DayViewerProps> = ({
  lessons,
  date,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 - 23

  return (
    <div className="">
      <h2 className="text-lg font-semibold text-left mb-2">
        {format(date, "EEEE, MMMM d")}
      </h2>
      <div className="grid grid-cols-[60px_1fr] text-sm border-t border-l">
        {hours.map((hour) => {
          const currentHourDate = addHours(date, hour);
          const lessonsInHour = lessons.filter(
            (l) =>
              isSameDay(parseISO(l.date), currentHourDate) &&
              isSameHour(parseISO(l.date), currentHourDate)
          );

          return (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="border-b border-r flex justify-center items-center text-xs font-mono">
                {String(hour).padStart(2, "0")}:00
              </div>

              {/* Lessons */}
              <div className="border-b border-r min-h-[50px] p-1 relative">
                {lessonsInHour.map((lesson, i) => (
                  <div
                    key={i}
                    className="bg-yellow-100 text-yellow-800 text-[12px] px-2 py-[2px] rounded mb-1 shadow-sm"
                  >
                    {lesson.name}
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
