"use client";

import LessonCard, { DisplayLesson } from "./lesson-card";

interface WeeklyScheduleProps {
  lessons: DisplayLesson[];
  onLessonClick?: (lesson: DisplayLesson) => void;
  currentTeacherId: string;
  currentStudentId: string;
  teacherName: string;
  studentName: string;
}

export default function WeeklySchedule({ 
  lessons, 
  onLessonClick, 
  currentTeacherId,
  currentStudentId,
  teacherName,
  studentName
}: WeeklyScheduleProps) {
  const weekdays = [
    { ja: "日曜日", en: "Sunday", short: "日" },
    { ja: "月曜日", en: "Monday", short: "月" },
    { ja: "火曜日", en: "Tuesday", short: "火" },
    { ja: "水曜日", en: "Wednesday", short: "水" },
    { ja: "木曜日", en: "Thursday", short: "木" },
    { ja: "金曜日", en: "Friday", short: "金" },
    { ja: "土曜日", en: "Saturday", short: "土" },
  ];

  const currentDayOfWeek = new Date().getDay();

  const getLessonTypeAndEditability = (lesson: DisplayLesson) => {
    const isCurrent = lesson.teacherId === currentTeacherId && lesson.studentId === currentStudentId;
    const isTeacherLesson = lesson.teacherId === currentTeacherId && lesson.studentId !== currentStudentId;
    const isStudentLesson = lesson.teacherId !== currentTeacherId && lesson.studentId === currentStudentId;
    
    let cardType: "teacher" | "student" | "current" = "current";
    
    if (isCurrent) {
      cardType = "current";
    } else if (isTeacherLesson) {
      cardType = "teacher";
    } else if (isStudentLesson) {
      cardType = "student";
    }
    
    return {
      cardType,
      isEditable: isCurrent
    };
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-px border border-gray-200 rounded overflow-hidden bg-gray-200">
        {weekdays.map((day, index) => (
          <div key={day.en} className="bg-white">
            <div className={`p-2 text-center font-medium mb-px ${index === currentDayOfWeek ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <div className="text-sm">{day.ja}</div>
              <div className="text-xs text-gray-500">{day.en}</div>
            </div>
            
            <div className="p-1 min-h-[30vh]">
              {lessons
                .filter(lesson => {
                  const dayOfWeek = typeof lesson.dayOfWeek === 'string' 
                    ? parseInt(lesson.dayOfWeek)
                    : lesson.dayOfWeek;
                  return dayOfWeek === index;
                })
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(lesson => {
                  const { cardType, isEditable } = getLessonTypeAndEditability(lesson);
                  
                  return (
                    <LessonCard 
                      key={lesson.id} 
                      lesson={lesson} 
                      onLessonClick={onLessonClick}
                      isEditable={isEditable}
                      cardType={cardType}
                      teacherName={teacherName}
                      studentName={studentName}
                    />
                  );
                })
              }
              
              {lessons.filter(lesson => {
                const dayOfWeek = typeof lesson.dayOfWeek === 'string'
                  ? parseInt(lesson.dayOfWeek)
                  : lesson.dayOfWeek;
                return dayOfWeek === index;
              }).length === 0 && (
                <div className="text-center text-gray-400 text-sm py-2">授業なし</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}