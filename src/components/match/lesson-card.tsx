"use client";

import { Card, CardContent } from "@/components/ui/card";
import { UserRound, Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

// Создаём новый интерфейс, не расширяющий Lesson, а содержащий нужные нам поля
export interface DisplayLesson {
  id: string;
  name: string;
  dayOfWeek: string | number;
  startTime: string;
  endTime: string;
  status: string;
  teacherId: string;
  studentId: string;
  subjectId?: string;
  subjectName?: string; 
  teacherName?: string;
  studentName?: string;
  room?: string;
}

interface LessonCardProps {
  lesson: DisplayLesson;
  onLessonClick?: (lesson: DisplayLesson) => void;
  isEditable: boolean;
  cardType: "teacher" | "student" | "current";
  teacherName: string;
  studentName: string;
}

const isLessonPassed = (lesson: DisplayLesson): boolean => {
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const lessonDayOfWeek = typeof lesson.dayOfWeek === 'string'
    ? parseInt(lesson.dayOfWeek)
    : lesson.dayOfWeek;

  if (lessonDayOfWeek < currentDayOfWeek) return true;
  if (lessonDayOfWeek > currentDayOfWeek) return false;

  const currentTime = format(today, "HH:mm");
  return lesson.endTime < currentTime;
};

export default function LessonCard({ 
  lesson, 
  onLessonClick, 
  isEditable, 
  cardType,
  teacherName,
  studentName 
}: LessonCardProps) {
  const isPassed = isLessonPassed(lesson);
  const dayOfWeekNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  const dayOfWeekNumber = typeof lesson.dayOfWeek === 'string'
    ? parseInt(lesson.dayOfWeek)
    : lesson.dayOfWeek;
  const dayOfWeekName = dayOfWeekNames[dayOfWeekNumber];

  let cardColorClass = "";
  
  if (isPassed) {
    cardColorClass = "bg-gray-100";
  } else {
    if (cardType === "current") {
      cardColorClass = "bg-white";
    } else if (cardType === "teacher") {
      cardColorClass = "bg-green-50";
    } else if (cardType === "student") {
      cardColorClass = "bg-blue-50";
    }
  }

  const displayTeacherName = lesson.teacherName || teacherName;
  const displayStudentName = lesson.studentName || studentName;

  return (
    <Card
      className={`mb-2 ${isEditable ? "cursor-pointer hover:shadow-md" : ""} transition-shadow overflow-hidden ${cardColorClass}`}
      onClick={() => isEditable && onLessonClick?.(lesson)}
    >
      <CardContent className="p-2">
        <div className="border-b pb-1 mb-1">
          <div className="text-base font-bold text-black text-center">
            {lesson.name}
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <div className="flex items-center">
            <UserRound className="h-4 w-4 mr-1 text-gray-500" />
            <div className="text-xs text-gray-700">
              先生: {displayTeacherName}
            </div>
          </div>

          <div className="flex items-center">
            <UserRound className="h-4 w-4 mr-1 text-gray-500" />
            <div className="text-xs text-gray-700">
              生徒: {displayStudentName}
            </div>
          </div>

          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
            <div className="text-xs text-gray-700">
              {dayOfWeekName}
            </div>
          </div>

          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-gray-500" />
            <div className="text-xs text-gray-700">
              {lesson.startTime}〜{lesson.endTime}
            </div>
          </div>

          {lesson.room && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-gray-500" />
              <div className="text-xs text-gray-700">
                {lesson.room}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}