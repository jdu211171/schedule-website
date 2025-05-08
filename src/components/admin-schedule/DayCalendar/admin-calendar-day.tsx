import { useState, useEffect, useMemo, useRef } from 'react';
import { useBooths } from '@/hooks/useBoothQuery';
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


export default function AdminCalendarDay() {
  const [selectedDays, setSelectedDays] = useState<Date[]>([new Date()]);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newLessonData, setNewLessonData] = useState<NewLessonData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ClassSession | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [resetSelectionKey, setResetSelectionKey] = useState<number>(0);

  const { data: boothsResponse, isLoading: isLoadingBooths } = useBooths({ limit: 100 });
  const booths = boothsResponse?.data || [];

  const [daysDataCache, setDaysDataCache] = useState<Record<string, DayData>>({});
  const activeFetchesRef = useRef<Set<string>>(new Set()); 

  useEffect(() => {
    const fetchClassSessionsForDay = async (day: Date) => {
      const dateKey = day.toISOString().split('T')[0];
      const dayOfWeekValue = dateToDayOfWeek(day); 

      if (activeFetchesRef.current.has(dateKey)) {
        console.log(`Fetch for ${dateKey} already in progress. Skipping.`);
        return;
      }

      try {
        console.log(`Initiating fetch for ${dateKey}`);
        activeFetchesRef.current.add(dateKey);

        setDaysDataCache(prev => ({
          ...prev,
          [dateKey]: {
            data: prev[dateKey]?.data || [],
            isLoading: true,
            error: null
          }
        }));

        const url = `/api/class-session?dayOfWeek=${dayOfWeekValue}&date=${dateKey}&limit=100&sort=startTime&order=asc`;
        console.log(`Fetching class sessions for ${dateKey} (${dayOfWeekValue}) from: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const jsonData = await response.json();

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
        activeFetchesRef.current.delete(dateKey);
      }
    };

    selectedDays.forEach(day => {
      const dateKey = day.toISOString().split('T')[0];
      const dayEntry = daysDataCache[dateKey];

      const shouldFetch = !dayEntry || (dayEntry && !dayEntry.isLoading && dayEntry.error);

      if (shouldFetch) {
        fetchClassSessionsForDay(day);
      }
    });

    const selectedDaysKeys = selectedDays.map(day => day.toISOString().split('T')[0]);
    const currentCacheKeys = Object.keys(daysDataCache);
    const keysToRemove = currentCacheKeys.filter(key => !selectedDaysKeys.includes(key));

    if (keysToRemove.length > 0) {
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
  }, [selectedDays, daysDataCache]);

  const isLoadingAnyDay = useMemo(() => {
    return selectedDays.some(day => {
        const dateKey = day.toISOString().split('T')[0];
        return daysDataCache[dateKey]?.isLoading === true;
    });
  }, [selectedDays, daysDataCache]);


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

  const refreshDay = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    setDaysDataCache(prev => ({
      ...prev,
      [dateKey]: {
        data: prev[dateKey]?.data || [],
        isLoading: false,
        error: new Error("Manual refresh triggered")
      }
    }));
  };

  const handleDaySelect = (date: Date, isSelected: boolean) => {
    setSelectedDays(prev => {
      const dateExists = prev.some(d =>
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
      );
      if (isSelected) {
        return dateExists ? prev : [...prev, date].sort((a,b) => a.getTime() - b.getTime());
      } else {
        return prev.filter(d =>
          !(d.getDate() === date.getDate() &&
            d.getMonth() === date.getMonth() &&
            d.getFullYear() === date.getFullYear())
        );
      }
    });
  };

  const handleCreateLesson = (date: Date, startTime: string, endTime: string, roomId: string) => {
    setNewLessonData({
      date,
      startTime,
      endTime,
      roomId
    });
    setTimeout(() => {
      setShowCreateDialog(true);
    }, 50);
  };

  const handleLessonClick = (lesson: ClassSession) => {
    setSelectedLesson(lesson);
    setDialogMode('view');
    setShowLessonDialog(true);
  };

  const handleSaveNewLesson = (lessonData: CreateLessonPayload) => {
    console.log('Creating new lesson:', lessonData);
    setShowCreateDialog(false);
    if (newLessonData) { 
      refreshDay(newLessonData.date);
    }
    setNewLessonData(null);
  };

  const handleUpdateLesson = (updatedLesson: UpdateLessonPayload) => {
    console.log('Updating lesson:', updatedLesson);
    setShowLessonDialog(false);
    if (selectedLesson) { 
      const lessonDate = new Date(selectedLesson.date);
      refreshDay(lessonDate);
    }
    setSelectedLesson(null);
  };

  const handleDeleteLesson = (lessonId: string) => {
    console.log('Deleting lesson:', lessonId);
    setShowLessonDialog(false);
    if (selectedLesson) {
      const lessonDate = new Date(selectedLesson.date);
      refreshDay(lessonDate);
    }
    setSelectedLesson(null);
  };

  if (isLoadingBooths) {
    return <div className="flex justify-center p-8">教室を読み込み中...</div>;
  }

  const globalErrorEntries = Object.entries(daysDataCache).filter(([, dayData]) => dayData.error && !dayData.isLoading);
  if (globalErrorEntries.length > 0 && !selectedDays.some(day => { const key = day.toISOString().split('T')[0]; return !daysDataCache[key] || daysDataCache[key]?.isLoading;} )) {
    return (
      <div className="flex flex-col justify-center items-center p-8 text-red-500">
        {globalErrorEntries.map(([dateKey, dayData]) => (
          <p key={dateKey}>{dateKey}のデータ読み込み中にエラーが発生しました: {dayData.error?.message}</p>
        ))}
         <button onClick={() => globalErrorEntries.forEach(([dateKey]) => refreshDay(new Date(dateKey)) )}
          className="mt-4 p-2 bg-blue-500 text-white rounded">
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

      {isLoadingAnyDay && <div className="text-center p-4 text-blue-600">カレンダーデータを更新中...</div>}

      <div className="space-y-8">
        {selectedDays.length === 0 && !isLoadingAnyDay && (
            <div className="text-center text-gray-500 py-10">スケジュールを表示する日を選択してください。</div>
        )}
        {selectedDays.map(day => {
          const dateKey = day.toISOString().split('T')[0];
          const dayData = daysDataCache[dateKey];

          if (!dayData || (dayData.isLoading && !dayData.data?.length)) {
            return (
              <div key={dateKey} className="border rounded-lg shadow-sm overflow-hidden bg-white">
                <div className="p-3 border-b bg-gray-50">
                  <Skeleton className="h-6 w-48 rounded" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex space-x-2">
                    <Skeleton className="h-10 w-[100px] rounded" />
                    {Array.from({ length: 5 }).map((_el, i) => ( 
                       <Skeleton key={i} className="h-10 flex-1 rounded" />
                    ))}
                  </div>
                  {Array.from({ length: Math.min(booths.length, 2) || 1 }).map((_el, roomIndex) => ( 
                    <div key={roomIndex} className="flex space-x-2 mt-1">
                      <Skeleton className="h-10 w-[100px] rounded" />
                      <Skeleton className="h-10 flex-1 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (dayData.error && !dayData.isLoading) {
              return (
                <div key={dateKey} className="border rounded-lg shadow-sm overflow-hidden bg-white p-4 text-red-500">
                    <h3 className="font-medium text-lg mb-2">{new Date(dateKey).toLocaleDateString()} の読み込みエラー</h3>
                    <p>{dayData.error.message}</p>
                    <button onClick={() => refreshDay(day)} className="mt-2 p-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                        再試行
                    </button>
                </div>
              )
          }

          return (
            <DayCalendar
              key={dateKey}
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

      {newLessonData && (
        <CreateLessonDialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setResetSelectionKey(prev => prev + 1);
              setNewLessonData(null);
            }
          }}
          lessonData={newLessonData}
          onSave={handleSaveNewLesson}
          rooms={booths}
        />
      )}

      {selectedLesson && (
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
