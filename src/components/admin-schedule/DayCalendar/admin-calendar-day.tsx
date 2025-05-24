import { useState, useMemo, useCallback, useEffect } from 'react';
import { useBooths } from '@/hooks/useBoothQuery';
import { ExtendedClassSessionWithRelations, useMultipleDaysClassSessions } from '@/hooks/useClassSessionQuery';
import { DaySelector } from './day-selector';
import { DayCalendar } from './day-calendar';
import { CreateLessonDialog } from './create-lesson-dialog';
import { LessonDialog } from './lesson-dialog';
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentDateAdjusted,
  getDateKey,
} from '../date';

import {
  CreateClassSessionPayload,
  UpdateClassSessionPayload,
  NewClassSessionData,
  formatDateToString
} from './types/class-session';

export type SelectionPosition = {
  row: number;
  col: number;
};

export type TimeSlot = {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
};

interface ApiErrorResponse {
  message?: string;
  error?: string;
  issues?: Array<{ message: string }>;
}

// Storage key for selected days persistence
const SELECTED_DAYS_KEY = "admin_calendar_selected_days";

const getUniqueKeyForDate = (date: Date, index: number): string => {
  return `${getDateKey(date)}-${index}`;
};

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
  // Initialize with a default value, will be updated after mount
  const [selectedDays, setSelectedDays] = useState<Date[]>([getCurrentDateAdjusted()]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newLessonData, setNewLessonData] = useState<NewClassSessionData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ExtendedClassSessionWithRelations | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [resetSelectionKey, setResetSelectionKey] = useState<number>(0);

  // On component mount, load the saved selected days from localStorage
  useEffect(() => {
    const savedDaysJson = localStorage.getItem(SELECTED_DAYS_KEY);
    if (savedDaysJson) {
      try {
        const savedDays = JSON.parse(savedDaysJson);
        if (Array.isArray(savedDays) && savedDays.length > 0) {
          const parsedDates = savedDays
            .map((dateStr: string) => new Date(dateStr))
            .filter((date: Date) => !isNaN(date.getTime()));
          if (parsedDates.length > 0) {
            setSelectedDays(parsedDates);
          }
        }
      } catch (error) {
        console.error('Error parsing saved selected days:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  const { data: boothsResponse, isLoading: isLoadingBooths } = useBooths({ limit: 100 });
  const booths = useMemo(() => boothsResponse?.data || [], [boothsResponse]);

  const selectedDatesStrings = useMemo(() => {
    return selectedDays.map(day => getDateKey(day));
  }, [selectedDays]);

  const classSessionQueries = useMultipleDaysClassSessions(selectedDatesStrings);

  const classSessionsByDate = useMemo(() => {
    const sessionsByDate: Record<string, ExtendedClassSessionWithRelations[]> = {};

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

  const timeSlots = TIME_SLOTS;

  const refreshData = useCallback(() => {
    const dateToRefresh = newLessonData?.date ||
      (selectedLesson?.date instanceof Date ?
        selectedLesson.date :
        selectedLesson?.date ? new Date(selectedLesson.date as string) : null);

    if (dateToRefresh) {
      const dateStrToRefresh = getDateKey(dateToRefresh);
      const queryIndex = selectedDatesStrings.indexOf(dateStrToRefresh);

      if (queryIndex !== -1) {
        classSessionQueries[queryIndex].refetch();
        return;
      }
    }

    classSessionQueries.forEach(query => query.refetch());
  }, [classSessionQueries, selectedDatesStrings, newLessonData, selectedLesson]);

  const handleDaySelect = useCallback((date: Date, isSelected: boolean) => {
    setSelectedDays(prev => {
      const dateStrSet = new Set(prev.map(d => getDateKey(d)));
      const dateStr = getDateKey(date);

      let newDays: Date[];
      if (isSelected) {
        if (dateStrSet.has(dateStr)) return prev;
        newDays = [...prev, date];
        newDays = newDays.sort((a, b) => a.getTime() - b.getTime());
      } else {
        if (!dateStrSet.has(dateStr)) return prev;
        newDays = prev.filter(d => getDateKey(d) !== dateStr);
      }

      // Save to localStorage
      localStorage.setItem(SELECTED_DAYS_KEY, JSON.stringify(newDays.map(d => d.toISOString())));

      return newDays;
    });
  }, []);

  const handleCreateLesson = useCallback((date: Date, startTime: string, endTime: string, boothId: string) => {
    const lessonData = { date, startTime, endTime, boothId };
    setNewLessonData(lessonData);
    setShowCreateDialog(true);
    setResetSelectionKey(prev => prev + 1);
  }, []);

  const handleLessonClick = useCallback((lesson: ExtendedClassSessionWithRelations) => {
    setSelectedLesson(lesson);
    setDialogMode('view');
    setShowLessonDialog(true);
  }, []);

  const handleSaveNewLesson = useCallback(async (lessonData: CreateClassSessionPayload) => {
    try {
      const dateStr = typeof lessonData.date === 'string' ?
        lessonData.date : formatDateToString(lessonData.date);

      const requestBody: any = {
        date: dateStr,
        startTime: lessonData.startTime,
        endTime: lessonData.endTime,
        teacherId: lessonData.teacherId || "",
        studentId: lessonData.studentId || "",
        subjectId: lessonData.subjectId || "",
        boothId: lessonData.boothId,
        classTypeId: lessonData.classTypeId || "",
        notes: lessonData.notes || ""
      };

      if (lessonData.isRecurring) {
        requestBody.isRecurring = true;
        requestBody.startDate = lessonData.startDate;
        if (lessonData.endDate) requestBody.endDate = lessonData.endDate;
        if (lessonData.daysOfWeek && lessonData.daysOfWeek.length > 0) {
          requestBody.daysOfWeek = lessonData.daysOfWeek;
        }
      }

      const response = await fetch('/api/class-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        let errorData: ApiErrorResponse = {};

        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          errorData = { message: errorText || `サーバーエラー: ${response.status}` };
        }

        let errorMessage = '授業の作成に失敗しました';

        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }

        if (errorData.issues && Array.isArray(errorData.issues)) {
          errorMessage += ': ' + errorData.issues.map((issue) => issue.message).join(', ');
        }

        throw new Error(errorMessage || `エラー ${response.status}: ${response.statusText}`);
      }

      let responseData;
      try {
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
        }
      } catch (parseError) {
        console.warn("応答のパースエラー:", parseError);
      }

      setShowCreateDialog(false);
      refreshData();
      setNewLessonData(null);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : '不明なエラー';
      if (errorMessage === '{}' || !errorMessage) {
        errorMessage = '授業の作成中にエラーが発生しました。データを確認して再度お試しください。';
      }

      alert(`授業の作成エラー: ${errorMessage}`);
    }
  }, [refreshData]);

  const handleUpdateLesson = useCallback((lessonId: string) => {
    setShowLessonDialog(false);
    refreshData();
    setSelectedLesson(null);
  }, [refreshData]);

  const handleDeleteLesson = useCallback((lessonId: string) => {
    setShowLessonDialog(false);
    refreshData();
    setSelectedLesson(null);
  }, [refreshData]);

  // Prevent rendering with default value during SSR/hydration to avoid flicker
  if (!isInitialized) {
    return null; // Show nothing during initial render to prevent flicker
  }

  if (isLoadingBooths) {
    return <div className="flex justify-center p-8 text-foreground dark:text-foreground">教室を読み込み中...</div>;
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">スケジュール管理</h2>
        <DaySelector
          selectedDays={selectedDays}
          onSelectDay={handleDaySelect}
        />
      </div>

      {isLoading && (
        <div className="text-center p-4 text-primary dark:text-primary">
          カレンダーデータを更新中...
          <span className="text-xs block mt-1 text-muted-foreground dark:text-muted-foreground">
            {selectedDays.map(day => getDateKey(day)).join(', ')}
          </span>
        </div>
      )}

      <div className="space-y-8">
        {selectedDays.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground dark:text-muted-foreground py-10">スケジュールを表示する日を選択してください。</div>
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
              <div key={uniqueKey} className="border rounded-lg shadow-sm overflow-hidden bg-background dark:bg-background border-border dark:border-border">
                <div className="p-3 border-b bg-muted dark:bg-muted border-border dark:border-border">
                  <Skeleton className="h-6 w-48 rounded" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex space-x-2">
                    <Skeleton className="h-10 w-[100px] rounded" />
                    {Array.from({ length: 5 }).map((_el, i) => (
                       <Skeleton key={`${uniqueKey}-skeleton-${i}`} className="h-10 flex-1 rounded" />
                    ))}
                  </div>
                  {Array.from({ length: Math.min(booths.length, 2) || 1 }).map((_el, boothIndex) => (
                    <div key={`${uniqueKey}-booth-${boothIndex}`} className="flex space-x-2 mt-1">
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
              booths={booths}
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
          booths={booths}
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
          booths={booths}
        />
      )}
    </div>
  );
}
