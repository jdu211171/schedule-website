import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBooths } from '@/hooks/useBoothQuery'; // Предполагается правильный импорт
import { ClassSession, dateToDayOfWeek } from '@/hooks/useScheduleClassSessions';
import { DaySelector } from './day-selector';
import { DayCalendar } from './day-calendar';
import { CreateLessonDialog } from './create-lesson-dialog';
import { LessonDialog } from './lesson-dialog';
import { Skeleton } from "@/components/ui/skeleton";

export type SelectionPosition = {
  row: number;
  col: number;
};

export type NewLessonData = {
  date: Date;
  startTime: string;
  endTime: string;
  roomId: string;
};

interface DayData {
  data: ClassSession[];
  isLoading: boolean;
  error: Error | null;
}

interface CreateLessonPayload extends NewLessonData {
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  classTypeId?: string;
  notes?: string | null;
}

interface UpdateLessonPayload extends Partial<ClassSession> {
  classId: string; 
}

// Функция для генерации уникальных ключей по дате
const getUniqueKeyForDate = (date: Date, index: number): string => {
  return `${date.toISOString().split('T')[0]}-${index}`;
};

// Функция для проверки, есть ли день в массиве
const isDayInArray = (day: Date, array: Date[]): boolean => {
  return array.some(d =>
    d.getDate() === day.getDate() &&
    d.getMonth() === day.getMonth() &&
    d.getFullYear() === day.getFullYear()
  );
};

// Функция для получения ключа даты
const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function AdminCalendarDay() {
  // Состояния
  const [selectedDays, setSelectedDays] = useState<Date[]>([new Date()]);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newLessonData, setNewLessonData] = useState<NewLessonData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ClassSession | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [resetSelectionKey, setResetSelectionKey] = useState<number>(0);
  const [daysDataCache, setDaysDataCache] = useState<Record<string, DayData>>({});
  
  // Для отслеживания активных запросов и ошибок
  const activeFetchesRef = useRef<Set<string>>(new Set());
  
  // ВАЖНО: Убираем абортконтроллеры - они могут вызывать проблемы,
  // если запросы не обрабатываются правильно
  
  // Получение данных о кабинетах
  const { data: boothsResponse, isLoading: isLoadingBooths } = useBooths({ limit: 100 });
  const booths = useMemo(() => boothsResponse?.data || [], [boothsResponse]);

  // Упрощенный fetchClassSessionsForDay без AbortController
  const fetchClassSessionsForDay = useCallback(async (day: Date) => {
    const dateKey = getDateKey(day);
    const dayOfWeekValue = dateToDayOfWeek(day);

    // Проверяем, не выполняется ли уже запрос для этого дня
    if (activeFetchesRef.current.has(dateKey)) {
      console.log(`Fetch for ${dateKey} already in progress. Skipping.`);
      return;
    }

    try {
      console.log(`Starting fetch for ${dateKey}`);
      activeFetchesRef.current.add(dateKey);

      // Обновляем состояние загрузки
      setDaysDataCache(prev => ({
        ...prev,
        [dateKey]: {
          data: prev[dateKey]?.data || [],
          isLoading: true,
          error: null
        }
      }));

      const url = `/api/class-session?dayOfWeek=${dayOfWeekValue}&date=${dateKey}&limit=100&sort=startTime&order=asc`;
      console.log(`Fetching from URL: ${url}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const jsonData = await response.json();
      console.log(`Received data for ${dateKey}:`, jsonData?.data?.length || 0, 'items');

      // Успешно обновляем данные
      setDaysDataCache(prev => ({
        ...prev,
        [dateKey]: {
          data: jsonData?.data && Array.isArray(jsonData.data) ? jsonData.data : [],
          isLoading: false,
          error: null
        }
      }));
    } catch (err) {
      console.error(`Error fetching class sessions for ${dateKey}:`, err);
      setDaysDataCache(prev => ({
        ...prev,
        [dateKey]: {
          data: prev[dateKey]?.data || [],
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err))
        }
      }));
    } finally {
      console.log(`Fetch for ${dateKey} completed`);
      activeFetchesRef.current.delete(dateKey);
    }
  }, []);

  // Эффект для управления данными дней - упрощенный
  useEffect(() => {
    console.log('Calendar days effect triggered. Selected days:', selectedDays.length);
    
    // Запускаем запросы для выбранных дней
    selectedDays.forEach(day => {
      const dateKey = getDateKey(day);
      const dayEntry = daysDataCache[dateKey];

      const shouldFetch = !dayEntry || (dayEntry && !dayEntry.isLoading && dayEntry.error);

      if (shouldFetch) {
        console.log(`Should fetch data for ${dateKey}`);
        fetchClassSessionsForDay(day);
      } else {
        console.log(`No need to fetch data for ${dateKey}. isLoading: ${dayEntry?.isLoading}, hasError: ${!!dayEntry?.error}`);
      }
    });

    // Очищаем кэш для дней, которые больше не выбраны
    const selectedDaysKeys = selectedDays.map(day => getDateKey(day));
    const currentCacheKeys = Object.keys(daysDataCache);
    const keysToRemove = currentCacheKeys.filter(key => !selectedDaysKeys.includes(key));

    if (keysToRemove.length > 0) {
      console.log('Removing unused days from cache:', keysToRemove);
      setDaysDataCache(prevCache => {
        const newCache = { ...prevCache };
        let changed = false;
        keysToRemove.forEach(key => {
          if (newCache[key]) {
            delete newCache[key];
            activeFetchesRef.current.delete(key);
            changed = true;
          }
        });
        return changed ? newCache : prevCache;
      });
    }
  }, [selectedDays, fetchClassSessionsForDay, daysDataCache]);

  // Проверка, загружается ли хотя бы один день
  const isLoadingAnyDay = useMemo(() => {
    const loadingDays = selectedDays.filter(day => {
        const dateKey = getDateKey(day);
        return daysDataCache[dateKey]?.isLoading === true;
    });
    
    // Добавляем лог для отладки
    if (loadingDays.length > 0) {
      console.log('Currently loading days:', loadingDays.map(d => getDateKey(d)));
    }
    
    return loadingDays.length > 0;
  }, [selectedDays, daysDataCache]);

  // Определение временных слотов
  const timeSlots = useMemo(() => {
    return Array.from({ length: 57 }, (_el, i) => { 
      const hours = Math.floor(i / 4) + 8;
      const startMinutes = (i % 4) * 15;
      let endHours, endMinutes;

      if (startMinutes === 45) {
        endHours = hours + 1;
        endMinutes = 0;
      } else {
        endHours = hours;
        endMinutes = startMinutes + 15;
      }

      return {
        index: i,
        start: `${hours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
        end: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
        display: `${hours}:${startMinutes === 0 ? '00' : startMinutes} - ${endHours}:${endMinutes === 0 ? '00' : endMinutes}`,
        shortDisplay: i % 4 === 0 ? `${hours}:00` : ''
      };
    });
  }, []);

  // Обновление данных дня - упрощенное
  const refreshDay = useCallback((date: Date) => {
    const dateKey = getDateKey(date);
    console.log(`Refreshing day: ${dateKey}`);
    
    // Принудительно устанавливаем ошибку для запуска нового запроса
    setDaysDataCache(prev => {
      // Если в данный момент есть загрузка, игнорируем, чтобы не зациклиться
      if (prev[dateKey]?.isLoading) {
        console.log(`Skip refresh for ${dateKey} as it's currently loading`);
        return prev;
      }
      
      console.log(`Setting error state for ${dateKey} to trigger reload`);
      return {
        ...prev,
        [dateKey]: {
          data: prev[dateKey]?.data || [],
          isLoading: false,
          error: new Error("Manual refresh triggered")
        }
      };
    });
    
    // Убираем из списка активных запросов, чтобы он мог быть запущен заново
    activeFetchesRef.current.delete(dateKey);
  }, []);

  // Обработчик выбора дня
  const handleDaySelect = useCallback((date: Date, isSelected: boolean) => {
    console.log(`Day selection changed: ${getDateKey(date)}, selected: ${isSelected}`);
    setSelectedDays(prev => {
      const dateExists = isDayInArray(date, prev);
      
      if (isSelected) {
        return dateExists ? prev : [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      } else {
        return prev.filter(d => !isDayInArray(d, [date]));
      }
    });
  }, []);

  // Обработчик создания урока
  const handleCreateLesson = useCallback((date: Date, startTime: string, endTime: string, roomId: string) => {
    console.log(`Creating lesson: ${getDateKey(date)} ${startTime}-${endTime} room: ${roomId}`);
    const lessonData = {
      date,
      startTime,
      endTime,
      roomId
    };
    
    // Устанавливаем данные и немедленно открываем диалог
    setNewLessonData(lessonData);
    setShowCreateDialog(true);
    
    // Сбрасываем выделение
    setResetSelectionKey(prev => prev + 1);
  }, []);

  // Обработчик клика по уроку
  const handleLessonClick = useCallback((lesson: ClassSession) => {
    console.log(`Lesson clicked: ${lesson.classId}`);
    setSelectedLesson(lesson);
    setDialogMode('view');
    setShowLessonDialog(true);
  }, []);

  // Обработчик сохранения нового урока
  const handleSaveNewLesson = useCallback((lessonData: CreateLessonPayload) => {
    console.log('Creating new lesson:', lessonData);
    setShowCreateDialog(false);
    
    if (newLessonData) { 
      refreshDay(newLessonData.date);
    }
    
    setNewLessonData(null);
  }, [newLessonData, refreshDay]);

  // Обработчик обновления урока
  const handleUpdateLesson = useCallback((updatedLesson: UpdateLessonPayload) => {
    console.log('Updating lesson:', updatedLesson);
    setShowLessonDialog(false);
    
    if (selectedLesson) { 
      const lessonDate = new Date(selectedLesson.date);
      refreshDay(lessonDate);
    }
    
    setSelectedLesson(null);
  }, [selectedLesson, refreshDay]);

  // Обработчик удаления урока
  const handleDeleteLesson = useCallback((lessonId: string) => {
    console.log('Deleting lesson:', lessonId);
    setShowLessonDialog(false);
    
    if (selectedLesson) {
      const lessonDate = new Date(selectedLesson.date);
      refreshDay(lessonDate);
    }
    
    setSelectedLesson(null);
  }, [selectedLesson, refreshDay]);

  // Определение глобальных ошибок
  const globalErrorEntries = useMemo(() => {
    return Object.entries(daysDataCache)
      .filter(([, dayData]) => dayData.error && !dayData.isLoading);
  }, [daysDataCache]);
  
  const hasLoadingDaysWithoutData = useMemo(() => {
    return selectedDays.some(day => {
      const key = getDateKey(day);
      return !daysDataCache[key] || daysDataCache[key]?.isLoading;
    });
  }, [selectedDays, daysDataCache]);

  // Добавляем отладочную информацию для состояния кэша
  console.log('Current calendar state:', {
    selectedDays: selectedDays.map(d => getDateKey(d)),
    loadingDays: Object.entries(daysDataCache)
      .filter(([, data]) => data.isLoading)
      .map(([key]) => key),
    errorDays: Object.entries(daysDataCache)
      .filter(([, data]) => data.error)
      .map(([key]) => key),
    activeFetches: Array.from(activeFetchesRef.current)
  });

  // Показываем скелетон при загрузке кабинетов
  if (isLoadingBooths) {
    return <div className="flex justify-center p-8">教室を読み込み中...</div>;
  }

  // Показываем ошибки, если они есть и нет загружающихся дней
  if (globalErrorEntries.length > 0 && !hasLoadingDaysWithoutData) {
    return (
      <div className="flex flex-col justify-center items-center p-8 text-red-500">
        {globalErrorEntries.map(([dateKey, dayData]) => (
          <p key={dateKey}>{dateKey}のデータ読み込み中にエラーが発生しました: {dayData.error?.message}</p>
        ))}
         <button 
           onClick={() => globalErrorEntries.forEach(([dateKey]) => refreshDay(new Date(dateKey)))}
           className="mt-4 p-2 bg-blue-500 text-white rounded"
         >
           エラーが発生したすべての日付で再試行
         </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold">スケジュール管理</h2>
        <DaySelector
          selectedDays={selectedDays}
          onSelectDay={handleDaySelect}
        />
      </div>

      {isLoadingAnyDay && (
        <div className="text-center p-4 text-blue-600">
          カレンダーデータを更新中... 
          {/* Отображаем, какие дни загружаются */}
          <span className="text-xs block mt-1 text-gray-500">
            {selectedDays
              .filter(day => {
                const dateKey = getDateKey(day);
                return daysDataCache[dateKey]?.isLoading === true;
              })
              .map(day => getDateKey(day))
              .join(', ')}
          </span>
        </div>
      )}

      <div className="space-y-8">
        {selectedDays.length === 0 && !isLoadingAnyDay && (
            <div className="text-center text-gray-500 py-10">スケジュールを表示する日を選択してください。</div>
        )}
        
        {selectedDays.map((day, index) => {
          const dateKey = getDateKey(day);
          const dayData = daysDataCache[dateKey];
          const uniqueKey = getUniqueKeyForDate(day, index);

          // Скелетон для загружающихся дней
          if (!dayData || (dayData.isLoading && !dayData.data?.length)) {
            return (
              <div key={uniqueKey} className="border rounded-lg shadow-sm overflow-hidden bg-white">
                <div className="p-3 border-b bg-gray-50">
                  <Skeleton className="h-6 w-48 rounded" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex space-x-2">
                    <Skeleton className="h-10 w-[100px] rounded" />
                    {Array.from({ length: 5 }).map((_el, i) => ( 
                       <Skeleton key={`${uniqueKey}-skeleton-${i}`} className="h-10 flex-1 rounded" />
                    ))}
                  </div>
                  {Array.from({ length: Math.min(booths.length, 2) || 1 }).map((_el, roomIndex) => ( 
                    <div key={`${uniqueKey}-room-${roomIndex}`} className="flex space-x-2 mt-1">
                      <Skeleton className="h-10 w-[100px] rounded" />
                      <Skeleton className="h-10 flex-1 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Отображение ошибки для конкретного дня
          if (dayData.error && !dayData.isLoading) {
              return (
                <div key={uniqueKey} className="border rounded-lg shadow-sm overflow-hidden bg-white p-4 text-red-500">
                    <h3 className="font-medium text-lg mb-2">{new Date(dateKey).toLocaleDateString()} の読み込みエラー</h3>
                    <p>{dayData.error.message}</p>
                    <button 
                      onClick={() => refreshDay(day)} 
                      className="mt-2 p-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      再試行
                    </button>
                </div>
              )
          }

          // Отображение календаря
          return (
            <DayCalendar
              key={uniqueKey}
              date={day}
              rooms={booths}
              timeSlots={timeSlots}
              classSessions={dayData.data || []}
              onLessonClick={handleLessonClick}
              onCreateLesson={handleCreateLesson}
              resetSelectionKey={resetSelectionKey}
            />
          );
        })}
      </div>

      {/* Диалог создания урока */}
      {showCreateDialog && newLessonData && (
        <CreateLessonDialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setNewLessonData(null);
            }
          }}
          lessonData={newLessonData}
          onSave={handleSaveNewLesson}
          rooms={booths}
        />
      )}

      {/* Диалог просмотра/редактирования урока */}
      {showLessonDialog && selectedLesson && (
        <LessonDialog
          open={showLessonDialog}
          onOpenChange={(open) => {
            setShowLessonDialog(open)
            if (!open) {
                setSelectedLesson(null);
            }
          }}
          lesson={selectedLesson}
          mode={dialogMode}
          onModeChange={setDialogMode}
          onSave={handleUpdateLesson}
          onDelete={handleDeleteLesson}
          rooms={booths}
        />
      )}
    </div>
  );
}