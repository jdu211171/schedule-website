import { useState, useMemo, useCallback } from 'react';
import { useBooths } from '@/hooks/useBoothQuery';
import { ClassSessionWithRelations, useMultipleDaysClassSessions } from '@/hooks/useClassSessionQuery';
import { DaySelector } from './day-selector';
import { DayCalendar } from './day-calendar';
import { CreateLessonDialog } from './create-lesson-dialog';
import { LessonDialog } from './lesson-dialog';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getCurrentDateAdjusted, 
  getDateString, 
  getDateKey,
} from '../date';

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

interface CreateLessonPayload extends NewLessonData {
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  subjectTypeId?: string;
  classTypeId?: string;
  notes?: string | null;
}

interface UpdateLessonPayload {
  classId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  boothId?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  subjectTypeId?: string;
  classTypeId?: string;
  notes?: string;
  [key: string]: any; // Allow additional fields
}

/**
 * Generates a unique key for a date with an index
 * @param date Date object
 * @param index Index to append to the key
 * @returns Unique key string
 */
const getUniqueKeyForDate = (date: Date, index: number): string => {
  return `${getDateKey(date)}-${index}`;
};

export type TimeSlot = {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
};

// Вынесенные за пределы компонента константные данные для оптимизации
const TIME_SLOTS: TimeSlot[] = Array.from({ length: 57 }, (_el, i) => { 
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

export default function AdminCalendarDay() {
  const [selectedDays, setSelectedDays] = useState<Date[]>([getCurrentDateAdjusted()]);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newLessonData, setNewLessonData] = useState<NewLessonData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ClassSessionWithRelations | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [resetSelectionKey, setResetSelectionKey] = useState<number>(0);
  
  const { data: boothsResponse, isLoading: isLoadingBooths } = useBooths({ limit: 100 });
  const booths = useMemo(() => boothsResponse?.data || [], [boothsResponse]);

  // Мемоизированные строки дат для запросов
  const selectedDatesStrings = useMemo(() => {
    return selectedDays.map(day => getDateKey(day));
  }, [selectedDays]);

  const classSessionQueries = useMultipleDaysClassSessions(selectedDatesStrings);

  // Организация данных по дате для оптимизации доступа
  const classSessionsByDate = useMemo(() => {
    const sessionsByDate: Record<string, ClassSessionWithRelations[]> = {};
    
    classSessionQueries.forEach((query, index) => {
      const dateStr = selectedDatesStrings[index];
      
      if (query.data?.data && Array.isArray(query.data.data)) {
        sessionsByDate[dateStr] = query.data.data;
      } else {
        sessionsByDate[dateStr] = [];
      }
    });
    
    return sessionsByDate;
  }, [classSessionQueries, selectedDatesStrings]);

  const isLoading = useMemo(() => {
    return classSessionQueries.some(query => query.isLoading || query.isFetching);
  }, [classSessionQueries]);

  // Используем предварительно созданные временные слоты вместо пересчета
  const timeSlots = TIME_SLOTS;

  // Оптимизированное обновление данных для избежания лишних запросов
  const refreshData = useCallback(() => {
    const dateToRefresh = newLessonData?.date || 
      (selectedLesson?.date instanceof Date ? 
        selectedLesson.date : 
        selectedLesson?.date ? new Date(selectedLesson.date) : null);
    
    if (dateToRefresh) {
      const dateStrToRefresh = getDateKey(dateToRefresh);
      // Находим и обновляем только те запросы, которые касаются этой даты
      const queryIndex = selectedDatesStrings.indexOf(dateStrToRefresh);
      
      if (queryIndex !== -1) {
        classSessionQueries[queryIndex].refetch();
        return; // Завершаем функцию после обновления конкретного дня
      }
    }
    
    // Если нет конкретной даты или ее нет в выбранных, обновляем все
    classSessionQueries.forEach(query => query.refetch());
  }, [classSessionQueries, selectedDatesStrings, newLessonData, selectedLesson]);

  // Оптимизированный обработчик выбора дня с использованием Set
  const handleDaySelect = useCallback((date: Date, isSelected: boolean) => {
    setSelectedDays(prev => {
      // Создаём уникальные идентификаторы дат для быстрого поиска
      const dateStrSet = new Set(prev.map(d => getDateKey(d)));
      const dateStr = getDateKey(date);
      
      if (isSelected) {
        if (dateStrSet.has(dateStr)) return prev; // Уже выбран, не делаем изменений
        const newDays = [...prev, date];
        return newDays.sort((a, b) => a.getTime() - b.getTime());
      } else {
        if (!dateStrSet.has(dateStr)) return prev; // Уже не выбран, не делаем изменений
        return prev.filter(d => getDateKey(d) !== dateStr);
      }
    });
  }, []);

  const handleCreateLesson = useCallback((date: Date, startTime: string, endTime: string, roomId: string) => {
    const lessonData = { date, startTime, endTime, roomId };
    setNewLessonData(lessonData);
    setShowCreateDialog(true);
    setResetSelectionKey(prev => prev + 1);
  }, []);

  const handleLessonClick = useCallback((lesson: ClassSessionWithRelations) => {
    setSelectedLesson(lesson);
    setDialogMode('view');
    setShowLessonDialog(true);
  }, []);

  // Оптимизированное создание урока с улучшенной обработкой данных
  const handleSaveNewLesson = useCallback(async (lessonData: CreateLessonPayload) => {
    try {
      // Получаем дату в формате YYYY-MM-DD
      const dateStr = getDateString(lessonData.date);
      
      // Обрабатываем время, убеждаясь что оно в формате HH:MM:SS
      const formatTimeWithSeconds = (time: string): string => {
        let formattedTime = time;
        // Добавляем двоеточие, если его нет
        if (!formattedTime.includes(':')) {
          formattedTime = `${formattedTime}:00`;
        }
        // Добавляем секунды, если их нет
        if (formattedTime.split(':').length < 3) {
          formattedTime = `${formattedTime}:00`;
        }
        return formattedTime;
      };
      
      const startTime = formatTimeWithSeconds(lessonData.startTime);
      const endTime = formatTimeWithSeconds(lessonData.endTime);
      
      // Создаем объект запроса в точном соответствии с требуемым форматом API
      const requestBody = {
        date: dateStr,
        startTime: startTime,
        endTime: endTime,
        boothId: lessonData.roomId,
        teacherId: lessonData.teacherId,
        studentId: lessonData.studentId,
        subjectId: lessonData.subjectId,
        subjectTypeId: lessonData.subjectTypeId,
        classTypeId: lessonData.classTypeId,
        notes: lessonData.notes || ""
      };
      
      console.log("授業作成リクエスト:", requestBody);
      
      // Отправляем запрос
      const response = await fetch('/api/class-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('授業作成エラー:', errorData);
        let errorMessage = '授業の作成に失敗しました';
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        if (errorData.issues && Array.isArray(errorData.issues)) {
          errorMessage += ': ' + errorData.issues.map((issue: any) => issue.message).join(', ');
        }
        
        throw new Error(errorMessage);
      }
  
      setShowCreateDialog(false);
      refreshData();
      setNewLessonData(null);
    } catch (error) {
      console.error('授業作成エラー:', error);
      alert(`授業の作成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [refreshData]);

  // Оптимизированное обновление урока с более эффективной обработкой данных
  const handleUpdateLesson = useCallback(async (updatedLesson: UpdateLessonPayload) => {
    try {
      // Создаем копию для изменения
      const lessonToUpdate: Record<string, any> = { ...updatedLesson };
      
      // Преобразуем дату в строку, если это объект Date
      if (lessonToUpdate.date instanceof Date) {
        lessonToUpdate.date = getDateString(lessonToUpdate.date);
      }
      
      // Обрабатываем время, убеждаясь что оно в формате HH:MM:SS без привязки к дате
      if (lessonToUpdate.startTime) {
        // Если время содержит T, извлекаем только часть времени
        if (typeof lessonToUpdate.startTime === 'string' && lessonToUpdate.startTime.includes('T')) {
          lessonToUpdate.startTime = lessonToUpdate.startTime.split('T')[1];
        }
        
        // Добавляем секунды, если их нет
        if (lessonToUpdate.startTime.split(':').length < 3) {
          lessonToUpdate.startTime = `${lessonToUpdate.startTime}:00`;
        }
      }
      
      // То же самое для endTime
      if (lessonToUpdate.endTime) {
        // Если время содержит T, извлекаем только часть времени
        if (typeof lessonToUpdate.endTime === 'string' && lessonToUpdate.endTime.includes('T')) {
          lessonToUpdate.endTime = lessonToUpdate.endTime.split('T')[1];
        }
        
        // Добавляем секунды, если их нет
        if (lessonToUpdate.endTime.split(':').length < 3) {
          lessonToUpdate.endTime = `${lessonToUpdate.endTime}:00`;
        }
      }
      
      // Преобразуем null в пустую строку для notes
      if (lessonToUpdate.notes === null) {
        lessonToUpdate.notes = "";
      }
      
      console.log("授業更新リクエスト:", lessonToUpdate);
    
      // Отправляем запрос
      const response = await fetch(`/api/class-session`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lessonToUpdate),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('授業更新エラー:', errorData);
        let errorMessage = '授業の更新に失敗しました';
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        if (errorData.issues && Array.isArray(errorData.issues)) {
          errorMessage += ': ' + errorData.issues.map((issue: any) => issue.message).join(', ');
        }
        
        throw new Error(errorMessage);
      }
  
      setShowLessonDialog(false);
      refreshData();
      setSelectedLesson(null);
    } catch (error) {
      console.error('授業更新エラー:', error);
      alert(`授業の更新エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [refreshData]);

  // Оптимизированное удаление урока
  const handleDeleteLesson = useCallback(async (lessonId: string) => {
    try {
      // Ask for confirmation
      if (!window.confirm('本当にこの授業を削除しますか？')) {
        return;
      }
      
      // Send to API endpoint
      const response = await fetch(`/api/class-session?classId=${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('授業削除エラー:', errorData);
        let errorMessage = '授業の削除に失敗しました';
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }

      setShowLessonDialog(false);
      refreshData();
      setSelectedLesson(null);
    } catch (error) {
      console.error('授業削除エラー:', error);
      alert(`授業の削除エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [refreshData]);

  if (isLoadingBooths) {
    return <div className="flex justify-center p-8">教室を読み込み中...</div>;
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

      {isLoading && (
        <div className="text-center p-4 text-blue-600">
          カレンダーデータを更新中... 
          <span className="text-xs block mt-1 text-gray-500">
            {selectedDays.map(day => getDateKey(day)).join(', ')}
          </span>
        </div>
      )}

      <div className="space-y-8">
        {selectedDays.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-10">スケジュールを表示する日を選択してください。</div>
        )}
        
        {selectedDays.map((day, index) => {
          const dateKey = getDateKey(day);
          const uniqueKey = getUniqueKeyForDate(day, index);
          const sessions = classSessionsByDate[dateKey] || [];
          
          const queryIndex = selectedDatesStrings.indexOf(dateKey);
          const isLoadingThisDay = queryIndex !== -1 ? 
            (classSessionQueries[queryIndex].isLoading || classSessionQueries[queryIndex].isFetching) : 
            false;

          if (isLoadingThisDay && !sessions.length) {
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

          return (
            <DayCalendar
              key={uniqueKey}
              date={day}
              rooms={booths}
              timeSlots={timeSlots}
              classSessions={sessions}
              onLessonClick={handleLessonClick}
              onCreateLesson={handleCreateLesson}
              resetSelectionKey={resetSelectionKey}
            />
          );
        })}
      </div>

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