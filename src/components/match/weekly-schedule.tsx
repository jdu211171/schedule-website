"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { UserRound, Calendar, Clock, MapPin } from "lucide-react";


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
  const dayOfWeekNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  const dayOfWeekName = dayOfWeekNames[lesson.dayOfWeek];

  return (
    <Card 
    className={`mb-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${isPassed ? 'bg-gray-100' : ''}`}

      onClick={() => onLessonClick?.(lesson)}
    >
      <CardContent className="pl-4">
          <div className="border-b pb-1 mb-1">
          <div className="text-lg font-bold text-black text-center">
            {lesson.subject}
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <div className="flex items-center">
            <UserRound className="h-4 w-4 mr-2 text-gray-500" />
            <div className="text-sm text-gray-700">
              {displayName}
            </div>
          </div>

          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <div className="text-sm text-gray-700">
              {dayOfWeekName}
            </div>
          </div>

          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-500" />
            <div className="text-sm text-gray-700">
              {lesson.startTime}〜{lesson.endTime}
            </div>
          </div>

          {lesson.room && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <div className="text-sm text-gray-700">
                {lesson.room}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Основной компонент расписания
export default function WeeklySchedule({ lessons, onLessonClick }: WeeklyScheduleProps) {
  // Удалил неиспользуемую переменную activeTab
  
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
      <Tabs defaultValue="teacher">
        <div className="flex items-center justify-between mb-2">
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