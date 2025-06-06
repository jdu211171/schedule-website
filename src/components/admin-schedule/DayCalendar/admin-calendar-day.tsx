import { useState, useMemo, useCallback, useEffect } from 'react';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { useBooths } from '@/hooks/useBoothQuery';
import { useTeachers, useTeacher } from '@/hooks/useTeacherQuery';
import { useStudents, useStudent } from '@/hooks/useStudentQuery';
import { useSubjects } from '@/hooks/useSubjectQuery';
import { useClassTypes } from '@/hooks/useClassTypeQuery';
import { useUserSubjectPreferencesByUser } from '@/hooks/useUserSubjectPreferenceQuery';
import { ExtendedClassSessionWithRelations, useMultipleDaysClassSessions, DayFilters } from '@/hooks/useClassSessionQuery';
import { DaySelector } from './day-selector';
import { DayCalendar } from './day-calendar';
import { CreateLessonDialog } from './create-lesson-dialog';
import { LessonDialog } from './lesson-dialog';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { X } from 'lucide-react';
import {
  getDateKey,
} from '../date';

import {
  CreateClassSessionPayload,
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

const VIEW_START_DATE_KEY = "admin_calendar_view_start_date";
const SELECTED_DAYS_KEY = "admin_calendar_selected_days_v2";

interface AdminCalendarDayProps {
  selectedBranchId?: string;
}

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

export default function AdminCalendarDay({ selectedBranchId }: AdminCalendarDayProps) {
  if (!selectedBranchId) {
    return (
      <div className="flex justify-center p-8 text-muted-foreground">
        Пожалуйста, выберите филиал для отображения расписания.
      </div>
    );
  }

  const today = useMemo(() => startOfDay(new Date()), []);
  
  const [viewStartDate, setViewStartDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_START_DATE_KEY);
      if (saved) {
        const date = new Date(saved);
        if (!isNaN(date.getTime()) && date >= today) {
          return startOfDay(date);
        }
      }
    }
    return today;
  });

  const [selectedDays, setSelectedDays] = useState<Date[]>(() => {
    if (typeof window !== 'undefined') {
      const savedDaysJson = localStorage.getItem(SELECTED_DAYS_KEY);
      if (savedDaysJson) {
        try {
          const savedDays = JSON.parse(savedDaysJson);
          if (Array.isArray(savedDays) && savedDays.length > 0) {
            const parsedDates = savedDays
              .map((dateStr: string) => new Date(dateStr))
              .filter((date: Date) => !isNaN(date.getTime()));

            const validDates = parsedDates.filter(date => {
              return date >= today;
            });

            if (validDates.length > 0) {
              return validDates;
            }
          }
        } catch (error) {
          console.error('Error parsing saved selected days:', error);
        }
      }
    }

    return [today];
  });

  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const [dayFilters, setDayFilters] = useState<Record<string, DayFilters>>({});
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newLessonData, setNewLessonData] = useState<NewClassSessionData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ExtendedClassSessionWithRelations | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [resetSelectionKey, setResetSelectionKey] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem(VIEW_START_DATE_KEY, viewStartDate.toISOString());
  }, [viewStartDate]);

  useEffect(() => {
    const daysToSave = selectedDays.map(d => d.toISOString());
    if (daysToSave.length > 0) {
      localStorage.setItem(SELECTED_DAYS_KEY, JSON.stringify(daysToSave));
    } else {
      localStorage.removeItem(SELECTED_DAYS_KEY);
    }
  }, [selectedDays]);

  const { data: boothsResponse, isLoading: isLoadingBooths } = useBooths({ limit: 100 });
  const { data: teachersResponse, isLoading: isLoadingTeachers } = useTeachers({ limit: 100 });
  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({ limit: 100 });
  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({ limit: 100 });
  const { data: classTypesResponse, isLoading: isLoadingClassTypes } = useClassTypes({ limit: 100 });

  const { data: teacherData } = useTeacher(selectedTeacherId);
  const { data: studentData } = useStudent(selectedStudentId);
  
  const teacherUserId = teacherData?.userId;
  const studentUserId = studentData?.userId;
  
  const { data: teacherPreferences } = useUserSubjectPreferencesByUser(teacherUserId || '');
  const { data: studentPreferences } = useUserSubjectPreferencesByUser(studentUserId || '');

  const booths = useMemo(() => boothsResponse?.data || [], [boothsResponse]);
  const teachers = useMemo(() => teachersResponse?.data || [], [teachersResponse]);
  const students = useMemo(() => studentsResponse?.data || [], [studentsResponse]);
  const subjects = useMemo(() => subjectsResponse?.data || [], [subjectsResponse]);
  const classTypes = useMemo(() => classTypesResponse?.data || [], [classTypesResponse]);

  const selectedDatesStrings = useMemo(() => {
    return selectedDays.map(day => getDateKey(day));
  }, [selectedDays]);

  const enhancedDayFilters = useMemo(() => {
    const enhanced: Record<string, DayFilters> = {};

    Object.entries(dayFilters).forEach(([dateKey, filters]) => {
      enhanced[dateKey] = {
        ...filters,
        branchId: selectedBranchId
      };
    });

    selectedDatesStrings.forEach(dateStr => {
      if (!enhanced[dateStr]) {
        enhanced[dateStr] = { branchId: selectedBranchId };
      }
    });

    return enhanced;
  }, [dayFilters, selectedBranchId, selectedDatesStrings]);

  const classSessionQueries = useMultipleDaysClassSessions(selectedDatesStrings, enhancedDayFilters);

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

  const isLoadingData = isLoadingBooths || isLoadingTeachers || isLoadingStudents || isLoadingSubjects || isLoadingClassTypes;

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

  const handleStartDateChange = useCallback((newStartDate: Date) => {
    setViewStartDate(newStartDate);
    setSelectedDays([newStartDate]);
    setDayFilters({});
  }, []);

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

        setDayFilters(prev => {
          const newFilters = { ...prev };
          delete newFilters[dateStr];
          return newFilters;
        });

        newDays = prev.filter(d => getDateKey(d) !== dateStr);
      }

      return newDays;
    });
  }, []);

  const handleFiltersChange = useCallback((dateKey: string, filters: DayFilters) => {
    setDayFilters(prev => ({
      ...prev,
      [dateKey]: filters
    }));
  }, []);

  const handleCreateLesson = useCallback((date: Date, startTime: string, endTime: string, boothId: string) => {
    const lessonData = { 
      date, 
      startTime, 
      endTime, 
      boothId,
      classTypeId: selectedClassTypeId,
      teacherId: selectedTeacherId,
      studentId: selectedStudentId
    };
    setNewLessonData(lessonData);
    setShowCreateDialog(true);
    setResetSelectionKey(prev => prev + 1);
  }, [selectedClassTypeId, selectedTeacherId, selectedStudentId]);

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

  const classTypeItems: SearchableSelectItem[] = classTypes.map((type) => ({
    value: type.classTypeId,
    label: type.name,
  }));

  const teacherItems: SearchableSelectItem[] = teachers.map((teacher) => ({
    value: teacher.teacherId,
    label: teacher.name,
  }));

  const studentItems: SearchableSelectItem[] = students.map((student) => ({
    value: student.studentId,
    label: student.name,
  }));

  const clearClassType = () => setSelectedClassTypeId('');
  const clearTeacher = () => setSelectedTeacherId('');
  const clearStudent = () => setSelectedStudentId('');

  const clearAllSelections = () => {
    setSelectedClassTypeId('');
    setSelectedTeacherId('');
    setSelectedStudentId('');
  };

  const hasActiveSelections = Boolean(selectedClassTypeId || selectedTeacherId || selectedStudentId);

  if (isLoadingData) {
    return <div className="flex justify-center p-8 text-foreground dark:text-foreground">データを読み込み中...</div>;
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="bg-background border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">授業作成の設定</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">授業タイプ</label>
              <SearchableSelect
                value={selectedClassTypeId}
                onValueChange={setSelectedClassTypeId}
                items={classTypeItems}
                placeholder="授業タイプを選択"
                searchPlaceholder="授業タイプを検索..."
                emptyMessage="授業タイプが見つかりません"
                disabled={isLoadingClassTypes}
              />
            </div>
            {selectedClassTypeId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearClassType}
                className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">教師</label>
              <SearchableSelect
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
                items={teacherItems}
                placeholder="教師を選択"
                searchPlaceholder="教師を検索..."
                emptyMessage="教師が見つかりません"
                disabled={isLoadingTeachers}
              />
            </div>
            {selectedTeacherId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTeacher}
                className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">生徒</label>
              <SearchableSelect
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
                items={studentItems}
                placeholder="生徒を選択"
                searchPlaceholder="生徒を検索..."
                emptyMessage="生徒が見つかりません"
                disabled={isLoadingStudents}
              />
            </div>
            {selectedStudentId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearStudent}
                className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedClassTypeId && selectedTeacherId && selectedStudentId ? (
              '選択された設定で授業を作成できます。カレンダーで時間枠をドラッグして授業を作成してください。'
            ) : (
              '授業を作成するには、授業タイプ、教師、生徒をすべて選択してください。'
            )}
          </div>
          
          {hasActiveSelections && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllSelections}
              className="h-8 text-xs whitespace-nowrap"
            >
              すべてクリア
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground"></h2>
        <DaySelector
          startDate={viewStartDate}
          selectedDays={selectedDays}
          onSelectDay={handleDaySelect}
          onStartDateChange={handleStartDateChange}
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
          const currentFilters = dayFilters[dateKey] || {};

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
            <div key={uniqueKey}>
              <DayCalendar
                date={day}
                booths={booths}
                timeSlots={timeSlots}
                classSessions={sessions}
                onLessonClick={handleLessonClick}
                onCreateLesson={handleCreateLesson}
                resetSelectionKey={resetSelectionKey}
                filters={currentFilters}
                onFiltersChange={(filters) => handleFiltersChange(dateKey, filters)}
                selectedTeacherId={selectedTeacherId}
                selectedStudentId={selectedStudentId}
                selectedClassTypeId={selectedClassTypeId}
              />
            </div>
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
          preselectedClassTypeId={selectedClassTypeId}
          preselectedTeacherId={selectedTeacherId}
          preselectedStudentId={selectedStudentId}
          teacherName={teacherData?.name || ''}
          studentName={studentData?.name || ''}
          teacherData={teacherData}
          studentData={studentData}
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
          teachers={teachers}
          students={students}
          subjects={subjects}
        />
      )}
    </div>
  );
}