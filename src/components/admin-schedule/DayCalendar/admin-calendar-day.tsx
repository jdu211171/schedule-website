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
  isDayInArray,
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

  const selectedDatesStrings = useMemo(() => {
    return selectedDays.map(day => getDateKey(day));
  }, [selectedDays]);

  const classSessionQueries = useMultipleDaysClassSessions(selectedDatesStrings);

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

  const timeSlots = useMemo<TimeSlot[]>(() => {
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

  const refreshData = useCallback(() => {
    const dateToRefresh = newLessonData?.date || 
      (selectedLesson?.date instanceof Date ? 
        selectedLesson.date : 
        selectedLesson?.date ? new Date(selectedLesson.date) : null);
    
    if (dateToRefresh) {
      const dateStrToRefresh = getDateKey(dateToRefresh);
      const queryIndex = selectedDatesStrings.indexOf(dateStrToRefresh);
      
      if (queryIndex !== -1) {
        classSessionQueries[queryIndex].refetch();
      } else {
        classSessionQueries.forEach(query => query.refetch());
      }
    } else {
      classSessionQueries.forEach(query => query.refetch());
    }
  }, [classSessionQueries, selectedDatesStrings, newLessonData, selectedLesson]);

  const handleDaySelect = useCallback((date: Date, isSelected: boolean) => {
    
    setSelectedDays(prev => {
      const dateExists = isDayInArray(date, prev);
      
      if (isSelected) {
        return dateExists ? prev : [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      } else {
        return prev.filter(d => !isDayInArray(d, [date]));
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

  // Function to create a new lesson
  const handleSaveNewLesson = useCallback(async (lessonData: CreateLessonPayload) => {
    try {
      const dateStr = getDateString(lessonData.date);
      
      // Проверяем формат времени и добавляем недостающие части
      let startTime = lessonData.startTime;
      let endTime = lessonData.endTime;
      
      // Проверяем, содержит ли время уже "T"
      if (!startTime.includes('T')) {
        startTime = `${dateStr}T${startTime}`;
      }
      
      if (!endTime.includes('T')) {
        endTime = `${dateStr}T${endTime}`;
      }
      
      // Проверяем, есть ли секунды в формате
      if (startTime.split(':').length < 3) {
        startTime = `${startTime}:00`;
      }
      
      if (endTime.split(':').length < 3) {
        endTime = `${endTime}:00`;
      }
      
      // Создаем объект запроса
      const requestBody = {
        date: dateStr,
        startTime,
        endTime,
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

  // Function to update an existing lesson
  const handleUpdateLesson = useCallback(async (updatedLesson: UpdateLessonPayload) => {
    try {
      // Create a copy of the lesson to update
      const lessonToUpdate: Record<string, any> = { ...updatedLesson };
      
      // Convert date to string format if it exists
      if (lessonToUpdate.date) {
        if (lessonToUpdate.date instanceof Date) {
          lessonToUpdate.date = getDateString(lessonToUpdate.date);
        }
      }
      
      // Convert start and end times to ISO format if they exist
      const dateStr = typeof lessonToUpdate.date === 'string' ? lessonToUpdate.date : '';
      
      if (lessonToUpdate.startTime && typeof lessonToUpdate.startTime === 'string') {
        // Check if it already has the ISO format with 'T'
        if (!String(lessonToUpdate.startTime).includes('T') && dateStr) {
          lessonToUpdate.startTime = `${dateStr}T${lessonToUpdate.startTime}:00`;
        }
      }
      
      if (lessonToUpdate.endTime && typeof lessonToUpdate.endTime === 'string') {
        // Check if it already has the ISO format with 'T'
        if (!String(lessonToUpdate.endTime).includes('T') && dateStr) {
          lessonToUpdate.endTime = `${dateStr}T${lessonToUpdate.endTime}:00`;
        }
      }
      
      // Convert null notes to empty string
      if (lessonToUpdate.notes === null) {
        lessonToUpdate.notes = "";
      }
      
      console.log("授業更新リクエスト:", lessonToUpdate);
      
      // Send to API endpoint
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

  // Function to delete a lesson
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