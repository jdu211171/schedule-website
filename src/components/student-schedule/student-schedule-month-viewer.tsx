import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import React from "react";
import { GetColorFunction } from "./student-schedule-week-viewer";
import { SPECIAL_CLASS_COLOR_CLASSES } from "@/lib/special-class-constants";

type MonthViewerProps = {
  lessons: ExtendedClassSessionWithRelations[];
  monthDate: Date;
  daysOfWeek: string[];
  setViewType: React.Dispatch<React.SetStateAction<"WEEK" | "MONTH">>;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  getColor: GetColorFunction;
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
    <div className="w-full max-w-full overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200 dark:border-gray-700">
        {days.map((day, ind) => {
          const dayLessons = lessons.filter((l) => isSameDay(l.date, day));
          const isCurrentDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, monthDate);
          const dayNumber = format(day, "d");

          return (
            <div
              key={ind}
              className={cn(
                "relative border-r border-b border-gray-200 dark:border-gray-700 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] cursor-pointer transition-colors duration-200",
                "hover:bg-gray-50 dark:hover:bg-gray-800",
                // Current day styling
                isCurrentDay && [
                  "bg-blue-50 dark:bg-blue-900/20",
                  "border-blue-300 dark:border-blue-600",
                  "hover:bg-blue-100 dark:hover:bg-blue-900/30",
                ],
                // Non-current month days
                !isCurrentMonth &&
                  "bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600"
              )}
              onClick={() => {
                setCurrentDate(day);
                setViewType("WEEK");
              }}
            >
              {/* Day Number */}
              <div className="flex justify-between items-start p-1 sm:p-2">
                <span
                  className={cn(
                    "text-sm sm:text-base font-medium",
                    isCurrentDay &&
                      "text-blue-600 dark:text-blue-400 font-bold",
                    !isCurrentMonth && "text-gray-400 dark:text-gray-600"
                  )}
                >
                  {dayNumber}
                </span>

                {/* Lesson count indicator for mobile */}
                {dayLessons.length > 0 && (
                  <div className="sm:hidden">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Lessons */}
              <div className="px-1 sm:px-2 pb-1 sm:pb-2 space-y-1">
                {dayLessons.slice(0, 3).map((lesson, idx) => {
                  const { text, border, background, hover } = getColor(
                    lesson.classTypeName as "通常授業" | "特別授業"
                  );
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "text-xs rounded px-1 py-0.5 truncate transition-colors duration-200",
                        text,
                        background,
                        hover,
                        // Hide on very small screens, show dot instead
                        "hidden sm:block"
                      )}
                      title={`${lesson.subjectName} - ${lesson.teacherName}`}
                    >
                      <span className="font-medium">
                        {lesson.subjectName || "Unknown Subject"}
                      </span>
                      {lesson.startTime && (
                        <span className="ml-1 opacity-75">
                          {format(
                            new Date(`2000-01-01T${lesson.startTime}`),
                            "HH:mm"
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Show more indicator */}
                {dayLessons.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1 hidden sm:block">
                    +{dayLessons.length - 3} more
                  </div>
                )}

                {/* Mobile lesson dots */}
                <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                  {dayLessons.slice(0, 6).map((lesson, idx) => {
                    const { background } = getColor(
                      lesson.classTypeName as "通常授業" | "特別授業"
                    );
                    return (
                      <div
                        key={idx}
                        className={cn("w-1.5 h-1.5 rounded-full", background)}
                        title={lesson.subjectName || "Unknown Subject"}
                      />
                    );
                  })}
                  {dayLessons.length > 6 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  )}
                </div>
              </div>

              {/* Current day indicator */}
              {isCurrentDay && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend for mobile */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>今日</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-100 dark:bg-blue-900/70 border border-blue-300 dark:border-blue-700 rounded-full"></div>
          <span>通常授業</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${SPECIAL_CLASS_COLOR_CLASSES.legendFill}`}
          ></div>
          <span className={SPECIAL_CLASS_COLOR_CLASSES.legendText}>
            特別授業
          </span>
        </div>
      </div>
    </div>
  );
};
