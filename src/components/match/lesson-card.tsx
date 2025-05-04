"use client";

import { Card, CardContent } from "@/components/ui/card";
import { UserRound, Calendar, Clock, MapPin } from "lucide-react";
import { DisplayLesson } from "./types";

interface LessonCardProps {
  lesson: DisplayLesson;
  onLessonClick?: (lesson: DisplayLesson) => void;
  isEditable: boolean;
  cardType: "teacher" | "student" | "current";
  teacherName: string;
  studentName: string;
}

export default function LessonCard({ 
  lesson, 
  onLessonClick, 
  isEditable, 
  cardType,
  teacherName,
  studentName 
}: LessonCardProps) {
  const dayOfWeekMap: Record<string, string> = {
    'SUNDAY': '日曜日',
    'MONDAY': '月曜日',
    'TUESDAY': '火曜日',
    'WEDNESDAY': '水曜日',
    'THURSDAY': '木曜日',
    'FRIDAY': '金曜日',
    'SATURDAY': '土曜日',
    '0': '日曜日',
    '1': '月曜日',
    '2': '火曜日',
    '3': '水曜日',
    '4': '木曜日',
    '5': '金曜日',
    '6': '土曜日'
  };

  const dayOfWeekName = dayOfWeekMap[lesson.dayOfWeek] || '不明';

  let cardColorClass = "";
  if (cardType === "current") {
    cardColorClass = "bg-white";
  } else if (cardType === "teacher") {
    cardColorClass = "bg-green-50";
  } else if (cardType === "student") {
    cardColorClass = "bg-blue-50";
  }

  const displayTeacherName = lesson.teacherName || teacherName;
  const displayStudentName = lesson.studentName || studentName;
  const displaySubjectName = lesson.name || lesson.subjectName || "不明";

  return (
    <Card
      className={`mb-2 ${isEditable ? "cursor-pointer hover:shadow-md" : ""} transition-shadow overflow-hidden ${cardColorClass}`}
      onClick={() => isEditable && onLessonClick?.(lesson)}
    >
      <CardContent className="p-2">
        <div className="border-b pb-1 mb-1">
          <div className="text-base font-bold text-black text-center">
            {displaySubjectName}
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