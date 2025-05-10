"use client";

import LessonCard from "./lesson-card";
import { DisplayLesson } from "./types";

interface WeeklyScheduleProps {
  lessons: DisplayLesson[];
  onLessonClick?: (lesson: DisplayLesson) => void;
  onLessonDelete?: (lesson: DisplayLesson) => void;
  currentTeacherId: string;
  currentStudentId: string;
  teacherName: string;
  studentName: string;
}

export default function WeeklySchedule({
                                         lessons,
                                         onLessonClick,
                                         onLessonDelete,
                                         currentTeacherId,
                                         currentStudentId,
                                         teacherName,
                                         studentName
                                       }: WeeklyScheduleProps) {
  // console.log("WeeklySchedule lessons:", lessons);

  const weekdays = [
    { ja: "日曜日", en: "Sunday", short: "日", value: "SUNDAY" },
    { ja: "月曜日", en: "Monday", short: "月", value: "MONDAY" },
    { ja: "火曜日", en: "Tuesday", short: "火", value: "TUESDAY" },
    { ja: "水曜日", en: "Wednesday", short: "水", value: "WEDNESDAY" },
    { ja: "木曜日", en: "Thursday", short: "木", value: "THURSDAY" },
    { ja: "金曜日", en: "Friday", short: "金", value: "FRIDAY" },
    { ja: "土曜日", en: "Saturday", short: "土", value: "SATURDAY" },
  ];

  const dayOfWeekMap: Record<string, number> = {
    'SUNDAY': 0,
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6,
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6
  };

  const currentDayOfWeek = new Date().getDay();

  // Определяем тип карточки и возможность редактирования
  const getLessonTypeAndEditability = (lesson: DisplayLesson) => {
    // Если тип занятия уже определен в объекте урока, используем его
    if (lesson.lessonType) {
      return {
        cardType: lesson.lessonType,
        isEditable: lesson.lessonType === 'current'
      };
    }

    // Иначе определяем тип на основе ID преподавателя и ученика
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

  // Функция для отображения занятий в правильном дне недели
  const getLessonsForDay = (dayIndex: number, dayValue: string): DisplayLesson[] => {
    return lessons.filter(lesson => {
      // Пытаемся преобразовать dayOfWeek к числовому значению для сравнения
      const lessonDayOfWeek = dayOfWeekMap[lesson.dayOfWeek];

      // П checking соответствие либо по числовому индексу, либо по строковому значению
      return lessonDayOfWeek === dayIndex || lesson.dayOfWeek === dayValue;
    });
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-px border border-input rounded overflow-hidden bg-muted">
        {weekdays.map((day, index) => {
          // Получаем занятия для текущего дня
          const dayLessons = getLessonsForDay(index, day.value);

          return (
            <div key={day.en} className="bg-white dark:bg-gray-800">
              <div className={`p-2 text-center font-medium mb-px ${index === currentDayOfWeek ? 'bg-accent/20 dark:bg-accent/10' : 'bg-muted/50 dark:bg-muted/30'}`}>
                <div className="text-sm text-foreground">{day.ja}</div>
                <div className="text-xs text-muted-foreground">{day.en}</div>
              </div>

              <div className="p-1 min-h-[30vh]">
                {dayLessons.length > 0 ? (
                  dayLessons
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((lesson, lessonIndex) => {
                      const { cardType, isEditable } = getLessonTypeAndEditability(lesson);

                      // Создаем уникальный ключ, объединяя идентификатор урока и индекс
                      const uniqueKey = `${lesson.id || lesson.templateId || 'lesson'}-${lessonIndex}`;

                      return (
                        <LessonCard
                          key={uniqueKey}
                          lesson={lesson}
                          onLessonClick={onLessonClick}
                          onLessonDelete={onLessonDelete}
                          isEditable={isEditable}
                          cardType={cardType}
                          teacherName={teacherName}
                          studentName={studentName}
                        />
                      );
                    })
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-2">授業なし</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Легенда для типов карточек */}
      <div className="flex justify-center mt-4 text-sm text-foreground">
        <div className="flex items-center mr-4">
          <div className="w-4 h-4 bg-white dark:bg-gray-800 border border-input mr-1"></div>
          <span>共通の授業 (編集可能)</span>
        </div>
        <div className="flex items-center mr-4">
          <div className="w-4 h-4 bg-green-50 dark:bg-green-900/20 border border-input mr-1"></div>
          <span>先生の授業</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/20 border border-input mr-1"></div>
          <span>生徒の授業</span>
        </div>
      </div>
    </div>
  );
}
