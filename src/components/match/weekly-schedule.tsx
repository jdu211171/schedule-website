"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";


interface Lesson {
  id: string;
  subject: string;
  teacherName: string;
  studentName: string;
  dayOfWeek: number; // 0-6, где 0 - воскресенье
  startTime: string; 
  endTime: string; 
  room?: string;
}

interface WeeklyScheduleProps {
  lessons: Lesson[];
  onLessonClick?: (lesson: Lesson) => void;
}

// Вспомогательная функция для определения, прошло ли время урока
const isLessonPassed = (lesson: Lesson): boolean => {
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0-6

  if (lesson.dayOfWeek < currentDayOfWeek) return true;
  if (lesson.dayOfWeek > currentDayOfWeek) return false;

  // Если сегодняшний день, проверяем время
  const currentTime = format(today, "HH:mm");
  return lesson.endTime < currentTime;
};

// Компонент карточки урока
const LessonCard = ({ lesson, onLessonClick, viewMode }: { lesson: Lesson, onLessonClick?: (lesson: Lesson) => void, viewMode: "teacher" | "student" }) => {
  const isPassed = isLessonPassed(lesson);
  const displayName = viewMode === "teacher" ? lesson.studentName : lesson.teacherName;

  return (
    <Card 
      className={`mb-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${isPassed ? 'bg-gray-100' : ''}`}
      onClick={() => onLessonClick?.(lesson)}
    >
      <CardContent className="p-2 pb-2">
        <div className={`font-medium leading-tight ${isPassed ? 'text-gray-500' : 'text-black'}`}>
          {lesson.subject}
        </div>
        <div className={`text-sm leading-tight mt-0.5 ${isPassed ? 'text-gray-400' : 'text-gray-600'}`}>
          {displayName}
        </div>
        <div className={`text-sm leading-tight mt-0.5 ${isPassed ? 'text-gray-400' : 'text-gray-600'}`}>
          {lesson.startTime} - {lesson.endTime}
        </div>
        {lesson.room && (
          <div className={`text-sm leading-tight mt-0.5 ${isPassed ? 'text-gray-400' : 'text-gray-600'}`}>
            {lesson.room}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Основной компонент расписания
export default function WeeklySchedule({ lessons, onLessonClick }: WeeklyScheduleProps) {
  const [activeTab, setActiveTab] = useState<"teacher" | "student">("teacher");
  
  // Дни недели для заголовков
  const weekdays = [
    { ja: "日曜日", en: "Sunday", short: "日" },
    { ja: "月曜日", en: "Monday", short: "月" },
    { ja: "火曜日", en: "Tuesday", short: "火" },
    { ja: "水曜日", en: "Wednesday", short: "水" },
    { ja: "木曜日", en: "Thursday", short: "木" },
    { ja: "金曜日", en: "Friday", short: "金" },
    { ja: "土曜日", en: "Saturday", short: "土" },
  ];

  // Получаем текущий день недели
  const currentDayOfWeek = new Date().getDay(); // 0-6

  return (
    <div className="w-full">
      <Tabs defaultValue="teacher" onValueChange={(value) => setActiveTab(value as "teacher" | "student")}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">授業スケジュール</h2>
          <TabsList>
            <TabsTrigger value="teacher">先生</TabsTrigger>
            <TabsTrigger value="student">生徒</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="teacher" className="mt-0">
          <div className="grid grid-cols-7 gap-px border border-gray-200 rounded overflow-hidden bg-gray-200">
            {weekdays.map((day, index) => (
              <div key={day.en} className="bg-white">
                <div className={`p-2 text-center font-medium mb-px ${index === currentDayOfWeek ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <div className="text-sm">{day.ja}</div>
                  <div className="text-xs text-gray-500">{day.en}</div>
                </div>
                
                <div className="p-1 min-h-[30vh]">
                  {lessons
                    .filter(lesson => lesson.dayOfWeek === index)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(lesson => (
                      <LessonCard 
                        key={lesson.id} 
                        lesson={lesson} 
                        onLessonClick={onLessonClick}
                        viewMode="teacher"
                      />
                    ))
                  }
                  
                  {lessons.filter(lesson => lesson.dayOfWeek === index).length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-2">授業なし</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="student" className="mt-0">
          <div className="grid grid-cols-7 gap-px border border-gray-200 rounded overflow-hidden bg-gray-200">
            {weekdays.map((day, index) => (
              <div key={day.en} className="bg-white">
                <div className={`p-2 text-center font-medium mb-px ${index === currentDayOfWeek ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <div className="text-sm">{day.ja}</div>
                  <div className="text-xs text-gray-500">{day.en}</div>
                </div>
                
                <div className="p-1 min-h-[30vh]">
                  {lessons
                    .filter(lesson => lesson.dayOfWeek === index)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(lesson => (
                      <LessonCard 
                        key={lesson.id} 
                        lesson={lesson} 
                        onLessonClick={onLessonClick}
                        viewMode="student"
                      />
                    ))
                  }
                  
                  {lessons.filter(lesson => lesson.dayOfWeek === index).length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-2">授業なし</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}