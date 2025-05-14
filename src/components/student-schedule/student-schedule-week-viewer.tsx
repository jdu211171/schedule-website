import { Lesson } from "@/app/student/page";
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { BookOpen, Clock9, History, School, User2 } from "lucide-react";
import React from "react";
type WeekViewerProps = {
  lessons: Lesson[];
  weekDate: Date;
  daysOfWeek: string[];
  getColor: (subjectId: string) => string;
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
                currentDay ? "bg-blue-200 font-bold" : ""
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
            const lessonDate = parseISO(lesson.date);
            return isSameDay(lessonDate, day);
          });

          return (
            <div
              key={dayIndex}
              className={`min-h-[200px] p-2 ${
                isToday(day) ? "bg-blue-100" : ""
              }`}
            >
              {lessonsOnDay.map((lesson, i) => {
                const bgColor = getColor(lesson.subject.subjectId);
                const start = format(parseISO(lesson.startTime), "HH:mm");
                const end = format(parseISO(lesson.endTime), "HH:mm");
                return (
                  <div
                    key={i}
                    className="rounded-2xl p-4 bg-white border border-gray-300 hover:border-gray-500 shadow-sm hover:shadow-lg transition-all duration-300 space-y-2 my-3"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* subject */}
                    <div className="flex items-center gap-2 text-gray-900">
                      <BookOpen className="w-5 h-5 text-gray-800" />
                      <span className="text-base font-semibold">
                        {lesson.subject.name}
                      </span>
                    </div>

                    {/* student */}
                    <div className="flex items-center gap-2 text-gray-700">
                      <User2 className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">{lesson.student.name}</span>
                    </div>

                    {/* teacher */}
                    <div className="flex items-center gap-2 text-gray-700">
                      <User2 className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">{lesson.teacher.name}</span>
                    </div>

                    {/* booth */}
                    <div className="flex items-center gap-2 text-gray-700">
                      <School className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">{lesson.booth.name}</span>
                    </div>

                    {/* time */}
                    <div className="flex flex-col justify-center items-start gap-1 text-gray-700 border-t pt-2 border-black">
                      <div className="flex items-center gap-2">
                        <Clock9 className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">
                          {start} - {end}
                        </span>
                      </div>
                      {/* duration time */}
                      <div className="text-xs text-gray-600 italic flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-600" />
                        {format(parseISO(lesson?.duration), "HH:mm")}
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
