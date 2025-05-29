import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  isSameMonth,
} from "date-fns";
import React from "react";
import { GetColorFunction } from "./student-schedule-week-viewer";
import { Calendar, ChevronRight, Clock, BookOpen } from "lucide-react";

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

  // Get stats for the month
  const currentMonthLessons = lessons.filter((lesson) =>
    isSameMonth(lesson.date, monthDate)
  );
  const totalLessons = currentMonthLessons.length;
  const daysWithLessons = new Set(
    currentMonthLessons.map((lesson) => format(lesson.date, "yyyy-MM-dd"))
  ).size;

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setViewType("WEEK");
  };

  return (
    <div className="w-full">
      {/* Month Header with Stats */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(monthDate, "yyyy年M月")}
          </h2>
          <div className="text-sm text-muted-foreground">
            {totalLessons > 0 ? `${totalLessons}件の授業` : "授業なし"}
          </div>
        </div>

        {totalLessons > 0 && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">授業日数:</span>
              <span className="font-medium">{daysWithLessons}日</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">総授業数:</span>
              <span className="font-medium">{totalLessons}件</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile View - Enhanced list format */}
      <div className="md:hidden space-y-3">
        {totalLessons === 0 ? (
          // Empty state for mobile
          <div className="text-center py-12 px-4">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {format(monthDate, "M月")}の授業はありません
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              この月は予定されている授業がありません
            </p>
            <div className="text-center">
              <button
                onClick={() => handleDayClick(new Date())}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                今日の予定を見る
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          // Days with lessons
          Object.values(
            currentMonthLessons.reduce((acc, lesson) => {
              const dateKey = format(lesson.date, "yyyy-MM-dd");
              if (!acc[dateKey]) {
                acc[dateKey] = {
                  date: new Date(lesson.date),
                  lessons: [],
                };
              }
              acc[dateKey].lessons.push(lesson);
              return acc;
            }, {} as Record<string, { date: Date; lessons: ExtendedClassSessionWithRelations[] }>)
          )
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map(({ date, lessons: dayLessons }) => {
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={format(date, "yyyy-MM-dd")}
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all cursor-pointer hover:shadow-md",
                    isCurrentDay
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-600 shadow-sm"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  onClick={() => handleDayClick(date)}
                >
                  {/* Date Header */}
                  <div
                    className={cn(
                      "px-4 py-3 text-sm font-semibold flex items-center justify-between",
                      isCurrentDay
                        ? "bg-blue-500 text-white dark:bg-blue-600"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {format(date, "M月d日")} (
                        {
                          daysOfWeek[
                            date.getDay() === 0 ? 6 : date.getDay() - 1
                          ]
                        }
                        )
                      </span>
                      {isCurrentDay && (
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                          今日
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                        {dayLessons.length}件
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Lessons Preview */}
                  <div className="p-4 space-y-2">
                    {dayLessons.slice(0, 3).map((lesson, idx) => {
                      const { text, border, background } = getColor(
                        lesson.classTypeName as "通常授業" | "特別授業"
                      );
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "text-sm rounded-md p-3 flex items-center justify-between",
                            text,
                            border,
                            background
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {lesson.subjectName || "科目未設定"}
                            </div>
                            <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {lesson.startTime.toString()} -{" "}
                              {lesson.endTime.toString()}
                            </div>
                          </div>
                          {lesson.teacherName && (
                            <div className="text-xs opacity-75 ml-2 flex-shrink-0">
                              {lesson.teacherName}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayLessons.length > 3 && (
                      <div className="text-center text-sm text-gray-500 py-2 border-t">
                        他{dayLessons.length - 3}件の授業があります
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Desktop View - Enhanced calendar grid */}
      <div className="hidden md:block">
        {totalLessons === 0 ? (
          // Empty state for desktop
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3">
              {format(monthDate, "yyyy年M月")}の授業はありません
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              この月は予定されている授業がありません。他の月を確認するか、今日の予定を見てみましょう。
            </p>
            <button
              onClick={() => handleDayClick(new Date())}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              今日の予定を見る
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 text-center font-semibold text-sm border-b pb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="py-2 text-gray-600 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, ind) => {
                const dayLessons = lessons.filter((l) =>
                  isSameDay(l.date, day)
                );
                const isCurrentDay = isToday(day);
                const isInCurrentMonth = isSameMonth(day, monthDate);
                const hasLessons = dayLessons.length > 0;

                return (
                  <div
                    key={ind}
                    className={cn(
                      "border rounded-lg p-3 min-h-[120px] cursor-pointer transition-all hover:shadow-sm",
                      isCurrentDay
                        ? "bg-blue-100 border-blue-400 hover:bg-blue-200 dark:bg-blue-950/30 dark:border-blue-600 dark:hover:bg-blue-950/50"
                        : hasLessons
                        ? "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30",
                      !isInCurrentMonth && "opacity-40 hover:opacity-60"
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={cn(
                          "text-sm font-bold",
                          isCurrentDay
                            ? "text-blue-600 dark:text-blue-400"
                            : isInCurrentMonth
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-600"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                      {hasLessons && (
                        <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full min-w-[16px] text-center">
                          {dayLessons.length}
                        </div>
                      )}
                    </div>

                    {/* Lessons */}
                    <div className="space-y-1">
                      {hasLessons ? (
                        <>
                          {dayLessons.slice(0, 2).map((lesson, idx) => {
                            const { text, border, background, hover } =
                              getColor(
                                lesson.classTypeName as "通常授業" | "特別授業"
                              );
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "text-xs rounded p-1.5 truncate transition-colors",
                                  text,
                                  border,
                                  background,
                                  hover
                                )}
                                title={`${
                                  lesson.subjectName
                                } - ${lesson.startTime.toString()}`}
                              >
                                <div className="font-medium truncate">
                                  {lesson.subjectName || "科目未設定"}
                                </div>
                                <div className="text-xs opacity-75 truncate">
                                  {lesson.startTime.toString()}
                                </div>
                              </div>
                            );
                          })}
                          {dayLessons.length > 2 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{dayLessons.length - 2}件
                            </div>
                          )}
                        </>
                      ) : isInCurrentMonth ? (
                        <div className="text-xs text-gray-400 text-center py-2">
                          授業なし
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
