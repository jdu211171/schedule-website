import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CalendarDays, Filter } from 'lucide-react';
import WeekLessonCard, { Lesson } from './week-lesson-card';
import { mockLessons as importedMockLessons } from './mock-lessons';
import CalendarFilters from './calendar-filters';
import {
  SUBJECTS,
  SUBJECTS_LIST,
  TEACHERS,
  TEACHERS_LIST,
  STUDENTS,
  STUDENTS_LIST
} from './subjectUtils';

type Room = {
  id: string;
  name: string;
};

type GroupedLessons = {
  [timeSlot: string]: Lesson[];
};

type AdminCalendarWeekProps = {
  lessons?: Lesson[];
  rooms?: Room[];
  currentDate?: Date;
  mode?: 'view' | 'create';
  onLessonSelect?: (lesson: Lesson) => void;
};


const weekDaysJa = [
  '月',
  '火',
  '水',
  '木',
  '金',
  '土',
  '日',
];

const defaultRooms = Array.from({ length: 15 }, (_, i) => ({
  id: `${i + 101}`,
  name: `教室 ${i + 101}`
}));

const AdminCalendarWeek: React.FC<AdminCalendarWeekProps> = ({
  lessons = importedMockLessons,
  rooms = defaultRooms,
  currentDate = new Date(),
  mode = 'view',
  onLessonSelect
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Состояния для фильтров
  const [selectedRooms, setSelectedRooms] = useState<string[]>(rooms.map(room => room.id));
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(Object.keys(SUBJECTS));
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(Object.keys(TEACHERS));
  const [selectedStudents, setSelectedStudents] = useState<string[]>(Object.keys(STUDENTS));

  // Отфильтрованные уроки
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      if (selectedRooms.length > 0 && !selectedRooms.includes(lesson.room)) {
        return false;
      }
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(lesson.subject)) {
        return false;
      }
      if (selectedTeachers.length > 0 && !selectedTeachers.includes(lesson.teacher)) {
        return false;
      }
      if (selectedStudents.length > 0 && !selectedStudents.includes(lesson.student)) {
        return false;
      }

      return true;
    });
  }, [lessons, selectedRooms, selectedSubjects, selectedTeachers, selectedStudents]);

  const startOfCurrentWeek = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 });
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startOfCurrentWeek, i);
      return {
        date: day,
        dayName: weekDaysJa[i],
        formattedDate: format(day, 'd MMMM', { locale: ja }),
        dayNumber: format(day, 'd', { locale: ja }),
        isToday: isSameDay(day, new Date())
      };
    });
  }, [startOfCurrentWeek]);

  // Переключение на предыдущую неделю
  const goToPreviousWeek = useCallback(() => {
    setSelectedDate(prev => addDays(prev, -7));
  }, []);

  // Переключение на следующую неделю
  const goToNextWeek = useCallback(() => {
    setSelectedDate(prev => addDays(prev, 7));
  }, []);

  // Переключение на текущую дату
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Функция для форматирования времени в формате HH:mm
  const formatTime = useCallback((date: Date) => {
    return format(date, 'HH:mm');
  }, []);

  // Получение занятий для конкретного дня
  const getLessonsForDay = useCallback((date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return filteredLessons.filter(lesson =>
      isWithinInterval(lesson.startTime, { start: dayStart, end: dayEnd })
    );
  }, [filteredLessons]);

  // Группировка занятий по времени начала
  const groupLessonsByTime = useCallback((dayLessons: Lesson[]): GroupedLessons => {
    const grouped: GroupedLessons = {};
    const sortedLessons = [...dayLessons].sort((a, b) =>
      a.startTime.getTime() - b.startTime.getTime()
    );
    sortedLessons.forEach(lesson => {
      const timeKey = formatTime(lesson.startTime);
      if (!grouped[timeKey]) {
        grouped[timeKey] = [];
      }
      grouped[timeKey].push(lesson);
    });

    return grouped;
  }, [formatTime]);

  // Обработчик клика по карточке занятия
  const handleLessonClick = useCallback((lessonId: string) => {
    setExpandedLessonId(expandedLessonId === lessonId ? null : lessonId);
    if (onLessonSelect && lessonId && expandedLessonId !== lessonId) {
      const selectedLesson = filteredLessons.find(lesson => lesson.id === lessonId);
      if (selectedLesson) {
        onLessonSelect(selectedLesson);
      }
    }
  }, [expandedLessonId, filteredLessons, onLessonSelect]);

  // Сброс расширенной карточки при изменении недели
  useEffect(() => {
    setExpandedLessonId(null);
  }, [selectedDate]);

  // Преобразование SUBJECTS_LIST в формат для компонента фильтра
  const formattedSubjects = useMemo(() => {
    return SUBJECTS_LIST.map(subject => ({
      id: subject.id,
      name: subject.name,
      color: subject.color.split(' ')[0].replace('bg-', '')
    }));
  }, []);

  // Преобразование TEACHERS_LIST в формат для компонента фильтра
  const formattedTeachers = useMemo(() => {
    return TEACHERS_LIST.map(teacher => ({
      id: teacher.id,
      name: teacher.name
    }));
  }, []);

  // Преобразование STUDENTS_LIST в формат для компонента фильтра
  const formattedStudents = useMemo(() => {
    return STUDENTS_LIST.map(student => ({
      id: student.id,
      name: student.name
    }));
  }, []);

  // Оптимизация расчета макета сетки
  const calculateLayout = useCallback((lessonsCount: number) => {
    if (lessonsCount <= 3) return { rows: 1, itemsPerRow: lessonsCount };
    if (lessonsCount === 4) return { rows: 2, itemsPerRow: 2 };
    if (lessonsCount <= 6) return { rows: 2, itemsPerRow: 3 };
    if (lessonsCount <= 8) return { rows: 2, itemsPerRow: 4 };
    if (lessonsCount === 9) return { rows: 3, itemsPerRow: 3 };
    if (lessonsCount <= 10) return { rows: 2, itemsPerRow: 5 };

    return {
      rows: Math.ceil(lessonsCount / 5),
      itemsPerRow: 5
    };
  }, []);

  return (
    <div className="w-full flex flex-col space-y-4">
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="font-semibold text-lg">
            {mode === 'view' ? 'スケジュール閲覧' : '授業マッチング'}
          </h2>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex space-x-1">
              <Button
                onClick={goToPreviousWeek}
                variant="outline"
                size="sm"
                aria-label="前週"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={goToToday}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <CalendarDays className="w-4 h-4 mr-1" />
                <span>今日</span>
              </Button>
              <Button
                onClick={goToNextWeek}
                variant="outline"
                size="sm"
                aria-label="次週"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="font-medium text-sm sm:text-base ml-0 sm:ml-2">
              {format(startOfCurrentWeek, 'd日M月', { locale: ja })} - {format(addDays(startOfCurrentWeek, 6), 'd日M月 yyyy年', { locale: ja })}
            </div>
            <Button
              ref={filterButtonRef}
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="ml-1 flex items-center"
            >
              <Filter className="w-4 h-4 mr-1" />
              <span>フィルター</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        {/* Заголовки дней недели */}
        <div className="grid grid-cols-7 border-b bg-muted">
          {weekDays.map((day) => (
            <div
              key={day.date.toString()}
              className={`text-center p-2 border-r last:border-r-0 font-medium ${day.isToday ? '' : ''}`}
            >
              <div className="mb-1">{day.dayName}曜日</div>
              <div className="text-base sm:text-lg">{day.dayNumber}</div>
            </div>
          ))}
        </div>

        {/* Контейнеры для дней недели */}
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day) => {
            const dayLessons = getLessonsForDay(day.date);
            const groupedLessons = groupLessonsByTime(dayLessons);

            return (
              <div
                key={day.date.toString()}
                className={`border-r last:border-r-0 p-2 h-full ${day.isToday ? 'bg-blue-50/30' : ''}`}
              >
                {/* Контейнер для карточек занятий */}
                <div className="space-y-3">
                  {Object.entries(groupedLessons).map(([timeSlot, lessonsAtTime]) => {
                    const { rows, itemsPerRow } = calculateLayout(lessonsAtTime.length);

                    return (
                      <div key={timeSlot} className="mb-2">
                        <div className="text-xs font-medium mb-1 pl-1">{timeSlot}</div>

                        {expandedLessonId && lessonsAtTime.some(lesson => lesson.id === expandedLessonId) ? (
                          // Если есть развернутая карточка, показываем только ее
                          <div className="w-full">
                            <WeekLessonCard
                              lesson={lessonsAtTime.find(l => l.id === expandedLessonId)!}
                              isExpanded={true}
                              displayMode="full"
                              onClick={handleLessonClick}
                            />
                          </div>
                        ) : (
                          // все карточки с адаптивной компоновкой
                          <div>
                            {Array.from({ length: rows }).map((_, rowIndex) => {
                              const rowLessons = lessonsAtTime.slice(
                                rowIndex * itemsPerRow,
                                (rowIndex + 1) * itemsPerRow
                              );

                              return (
                                <div key={rowIndex} className="grid mb-1" style={{
                                  gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
                                  gap: '2px'
                                }}>
                                  {rowLessons.map(lesson => {
                                    // правильный режим отображения на основе количества элементов в ряду
                                    let displayMode: 'full' | 'compact-2' | 'compact-3' | 'compact-5' | 'compact-many' = 'full';

                                    if (itemsPerRow === 2) displayMode = 'compact-2';
                                    else if (itemsPerRow === 3) displayMode = 'compact-3';
                                    else if (itemsPerRow === 5) displayMode = 'compact-5';
                                    else if (itemsPerRow > 5) displayMode = 'compact-many';

                                    return (
                                      <WeekLessonCard
                                        key={lesson.id}
                                        lesson={lesson}
                                        isExpanded={false}
                                        displayMode={displayMode}
                                        onClick={handleLessonClick}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Сообщение, если нет занятий */}
                  {Object.keys(groupedLessons).length === 0 && (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      予定なし
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Фильтры календаря */}
      {showFilters && (
        <CalendarFilters
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          rooms={rooms}
          selectedRooms={selectedRooms}
          onRoomsChange={setSelectedRooms}
          subjects={formattedSubjects}
          selectedSubjects={selectedSubjects}
          onSubjectsChange={setSelectedSubjects}
          teachers={formattedTeachers}
          selectedTeachers={selectedTeachers}
          onTeachersChange={setSelectedTeachers}
          students={formattedStudents}
          selectedStudents={selectedStudents}
          onStudentsChange={setSelectedStudents}
          filterType="week"
          onClose={() => setShowFilters(false)}
          onApplyFilters={() => setShowFilters(false)}
          buttonRef={filterButtonRef}
        />
      )}
    </div>
  );
};

export default AdminCalendarWeek;
