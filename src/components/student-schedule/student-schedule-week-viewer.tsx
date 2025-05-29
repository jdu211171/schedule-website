import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { BookOpen, Clock9, History, School, User2 } from "lucide-react";
import React from "react";

export type GetColorFunction = (subjectType: "通常授業" | "特別授業") => {
  background: string;
  border: string;
  text: string;
  hover: string;
  iconColor: string;
};

type WeekViewerProps = {
  lessons: ExtendedClassSessionWithRelations[];
  weekDate: Date;
  daysOfWeek: string[];
  getColor: GetColorFunction;
};

export const StudentScheduleWeekViewer: React.FC<WeekViewerProps> = ({
  lessons,
  weekDate,
  daysOfWeek,
  getColor,
}) => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="w-full">
      {/* Mobile View - Stack days vertically */}
      <div className="md:hidden space-y-4">
        {days.map((day, dayIndex) => {
          const lessonsOnDay = lessons.filter((lesson) => {
            const lessonDate = lesson.date;
            return isSameDay(lessonDate, day);
          });

          const currentDay = isToday(day);

          return (
            <div key={dayIndex} className="border rounded-lg overflow-hidden">
              {/* Day Header */}
              <div
                className={cn(
                  "px-4 py-3 text-center font-semibold text-sm",
                  currentDay
                    ? "bg-blue-500 text-white dark:bg-blue-600"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                )}
              >
                {daysOfWeek[dayIndex]} {format(day, "M/d")}
              </div>

              {/* Lessons */}
              <div className="p-3 space-y-3 min-h-[100px]">
                {lessonsOnDay.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    授業なし
                  </div>
                ) : (
                  lessonsOnDay.map((lesson, i) => {
                    const { text, border, background, hover, iconColor } =
                      getColor(lesson.classTypeName as "通常授業" | "特別授業");

                    return (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg p-3 space-y-2 transition-colors",
                          background,
                          hover,
                          border
                        )}
                      >
                        {/* Subject */}
                        <div className="flex items-center gap-2">
                          <BookOpen
                            className={cn(iconColor, "w-4 h-4 flex-shrink-0")}
                          />
                          <span
                            className={cn(
                              "text-sm font-semibold truncate",
                              text
                            )}
                          >
                            {lesson.subjectName || "科目未設定"}
                          </span>
                        </div>

                        {/* Teacher and Booth - Side by side on mobile */}
                        <div className="grid grid-cols-1 gap-1 text-xs">
                          <div className="flex items-center gap-2">
                            <User2
                              className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                            />
                            <span className={cn("truncate", text)}>
                              {lesson.teacherName || "教師未設定"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <School
                              className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                            />
                            <span className={cn("truncate", text)}>
                              {lesson.boothName || "教室未設定"}
                            </span>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock9
                              className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                            />
                            <span className={cn("text-xs", text)}>
                              {lesson.startTime.toString()} -{" "}
                              {lesson.endTime.toString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <History className={cn(iconColor, "w-3 h-3")} />
                            <span className={cn("text-xs", text)}>
                              {lesson.duration
                                ? `${lesson.duration}分`
                                : "時間未設定"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View - Grid layout */}
      <div className="hidden md:block overflow-auto">
        {/* Headers */}
        <div className="grid grid-cols-7 text-sm font-semibold">
          {days.map((day, i) => {
            const currentDay = isToday(day);
            return (
              <div
                key={i}
                className={cn(
                  "text-center px-2 py-3 border-b",
                  currentDay
                    ? "bg-blue-400 text-white font-bold dark:bg-blue-600"
                    : "bg-gray-50 dark:bg-gray-800"
                )}
              >
                <div>{daysOfWeek[i]}</div>
                <div className="text-lg">{format(day, "d")}</div>
              </div>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((day, dayIndex) => {
            const lessonsOnDay = lessons.filter((lesson) => {
              const lessonDate = lesson.date;
              return isSameDay(lessonDate, day);
            });

            return (
              <div
                key={dayIndex}
                className={cn(
                  "border-r border-gray-200 dark:border-gray-700 p-2 space-y-2",
                  isToday(day) && "bg-blue-50 dark:bg-blue-950/20"
                )}
              >
                {lessonsOnDay.map((lesson, i) => {
                  const { text, border, background, hover, iconColor } =
                    getColor(lesson.classTypeName as "通常授業" | "特別授業");

                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg p-3 space-y-2 transition-colors",
                        background,
                        hover,
                        border
                      )}
                    >
                      {/* Subject */}
                      <div className="flex items-center gap-2">
                        <BookOpen
                          className={cn(iconColor, "w-4 h-4 flex-shrink-0")}
                        />
                        <span className={cn("text-sm font-semibold", text)}>
                          {lesson.subjectName || "科目未設定"}
                        </span>
                      </div>

                      {/* Teacher */}
                      <div className="flex items-center gap-2">
                        <User2
                          className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                        />
                        <span className={cn("text-xs", text)}>
                          {lesson.teacherName || "教師未設定"}
                        </span>
                      </div>

                      {/* Booth */}
                      <div className="flex items-center gap-2">
                        <School
                          className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                        />
                        <span className={cn("text-xs", text)}>
                          {lesson.boothName || "教室未設定"}
                        </span>
                      </div>

                      {/* Time */}
                      <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock9
                            className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                          />
                          <span className={cn("text-xs", text)}>
                            {lesson.startTime.toString()} -{" "}
                            {lesson.endTime.toString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <History
                            className={cn(iconColor, "w-3 h-3 flex-shrink-0")}
                          />
                          <span className={cn("text-xs", text)}>
                            {lesson.duration
                              ? `${lesson.duration}分`
                              : "時間未設定"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
