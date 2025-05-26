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
    <div className="overflow-auto">
      <div className="grid grid-cols-7 text-sm font-semibold">
        {days.map((day, i) => {
          const currentDay = isToday(day);
          return (
            <div
              key={i}
              className={`text-center px-2 py-1 ${
                currentDay ? "bg-blue-400 font-bold dark:bg-gray-900" : ""
              }`}
            >
              {daysOfWeek[i]} <br />
              {format(day, "d")}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, dayIndex) => {
          const lessonsOnDay = lessons.filter((lesson) => {
            const lessonDate = lesson.date;
            return isSameDay(lessonDate, day);
          });

          return (
            <div
              key={dayIndex}
              className={`min-h-[200px] p-2 ${
                isToday(day) ? "bg-blue-300 dark:bg-gray-800" : ""
              }`}
            >
              {" "}
              {lessonsOnDay.map((lesson, i) => {
                const { text, border, background, hover, iconColor } = getColor(
                  lesson.classTypeName as "通常授業" | "特別授業"
                );

                return (
                  <div
                    key={i}
                    className={`rounded-xl p-4 dark:text-white space-y-2 my-3 ${background} ${hover} ${border}
                     `}
                  >
                    {/* subject */}
                    <div className="flex items-center gap-2 text-gray-900">
                      <BookOpen className={cn(iconColor)} />
                      <span className={cn("text-base font-semibold", text)}>
                        {lesson.subjectName || "Unknown Subject"}
                      </span>
                    </div>
                    {/* teacher */}
                    <div className="flex items-center gap-2 text-gray-700">
                      <User2 className={cn(iconColor, "w-4 h-4")} />
                      <span className={cn(" text-sm", text)}>
                        {lesson.teacherName || "No Teacher"}
                      </span>
                    </div>
                    {/* booth */}
                    <div className="flex items-center gap-2 text-gray-700">
                      <School className={cn(iconColor, "w-4 h-4")} />
                      <span className={cn("text-sm", text)}>
                        {lesson.boothName || "No Booth"}
                      </span>
                    </div>
                    {/* time */}
                    <div className="flex flex-col justify-center items-start gap-1 text-gray-700 border-t pt-2 border-black">
                      <div className="flex items-center gap-2">
                        <Clock9 className={cn(iconColor, "w-4 h-4")} />
                        <span className={cn("text-sm", text)}>
                          {lesson.startTime.toString()} -{" "}
                          {lesson.endTime.toString()}
                        </span>
                      </div>
                      {/* duration time */}
                      <div
                        className={cn(
                          "text-xs text-gray-600 italic flex items-center gap-2",
                          text
                        )}
                      >
                        <History className={cn(iconColor, "w-4 h-4")} />
                        {lesson.duration
                          ? `${lesson.duration} minutes`
                          : "Duration not set"}
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
  );
};
