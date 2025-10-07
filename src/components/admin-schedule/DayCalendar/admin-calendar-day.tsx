"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { startOfDay, startOfWeek, isSameWeek } from 'date-fns';
import { toast } from 'sonner';
import { useBooths } from '@/hooks/useBoothQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useTeachers, useTeacher } from '@/hooks/useTeacherQuery';
import { useStudents, useStudent } from '@/hooks/useStudentQuery';
import { useSubjects } from '@/hooks/useSubjectQuery';
import { useClassTypes } from '@/hooks/useClassTypeQuery';
import { ExtendedClassSessionWithRelations, useMultipleDaysClassSessions, DayFilters } from '@/hooks/useClassSessionQuery';
import { DaySelector } from './day-selector';
import { DayCalendar } from './day-calendar';
import { CreateLessonDialog } from './create-lesson-dialog';
import { LessonDialog } from './lesson-dialog';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { Combobox } from '@/components/ui/combobox';
import { useDebounce } from '@/hooks/use-debounce';
import { useSmartSelection, EnhancedTeacher, EnhancedStudent } from '@/hooks/useSmartSelection';
import {
  CompatibilityComboboxItem,
  getCompatibilityPriority,
  renderCompatibilityComboboxItem,
} from "../compatibility-combobox-utils";
import { X } from 'lucide-react';
import { SPECIAL_CLASS_COLOR_CLASSES } from '@/lib/special-class-constants';
import {
  getDateKey,
} from '../date';

import {
  CreateClassSessionWithConflictsPayload,
  NewClassSessionData,
  formatDateToString,
  ConflictResponse
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
const SHOW_CANCELLED_KEY = "admin_calendar_show_cancelled";

interface AdminCalendarDayProps {
  selectedBranchId?: string;
}

type AvailabilityMode = 'with-special' | 'regular-only';

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
  const today = useMemo(() => startOfDay(new Date()), []);
  const currentWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);

  // Default focus on 'today' instead of week start
  const [viewStartDate, setViewStartDate] = useState<Date>(() => today);
  const [selectedDays, setSelectedDays] = useState<Date[]>([today]);
  const [isInitialized, setIsInitialized] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const saved = localStorage.getItem(VIEW_START_DATE_KEY);
      if (saved) {
        const date = new Date(saved);
        if (!isNaN(date.getTime())) {
          // If saved date is in the same week as today, use the saved day itself.
          // Otherwise, focus today.
          if (isSameWeek(date, today, { weekStartsOn: 1 })) {
            setViewStartDate(startOfDay(date));
          } else {
            setViewStartDate(today);
          }
        } else {
          setViewStartDate(today);
        }
      } else {
        setViewStartDate(today);
      }

      const savedDaysJson = localStorage.getItem(SELECTED_DAYS_KEY);
      if (savedDaysJson) {
        try {
          const savedDays = JSON.parse(savedDaysJson);
          if (Array.isArray(savedDays) && savedDays.length > 0) {
            const parsedDates = savedDays
              .map((dateStr: string) => new Date(dateStr))
              .filter((date: Date) => !isNaN(date.getTime()));

            // Only restore if at least one date is in the same week as the current viewStartDate
            const base = viewStartDate;
            const inSameWeek = parsedDates.filter(date => isSameWeek(date, base, { weekStartsOn: 1 }));

            if (inSameWeek.length > 0) {
              setSelectedDays(inSameWeek.sort((a,b) => a.getTime() - b.getTime()));
            } else {
              setSelectedDays([base]);
            }
          } else {
            setSelectedDays([viewStartDate]);
          }
        } catch (error) {
          console.error('Error parsing saved selected days:', error);
          setSelectedDays([viewStartDate]);
        }
      } else {
        setSelectedDays([viewStartDate]);
      }

      setIsInitialized(true);
    }
  }, [today, isInitialized]);

  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const debouncedTeacherSearchQuery = useDebounce(teacherSearchQuery, 300);
  const debouncedStudentSearchQuery = useDebounce(studentSearchQuery, 300);

  const [globalAvailabilityMode, setGlobalAvailabilityMode] = useState<AvailabilityMode>('with-special');
  const [dayAvailabilitySettings, setDayAvailabilitySettings] = useState<Record<string, AvailabilityMode>>({});
  const [showCancelled, setShowCancelled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(SHOW_CANCELLED_KEY);
    return saved === null ? false : saved === 'true';
  });

  const [dayFilters, setDayFilters] = useState<Record<string, DayFilters>>({});
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newLessonData, setNewLessonData] = useState<NewClassSessionData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ExtendedClassSessionWithRelations | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [resetSelectionKey, setResetSelectionKey] = useState<number>(0);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(VIEW_START_DATE_KEY, viewStartDate.toISOString());
    }
  }, [viewStartDate, isInitialized]);

  // Removed global "focus date" event handler; conflicts are resolved within Series fast dialog

  useEffect(() => {
    if (isInitialized) {
      const daysToSave = selectedDays.map(d => d.toISOString());
      if (daysToSave.length > 0) {
        localStorage.setItem(SELECTED_DAYS_KEY, JSON.stringify(daysToSave));
      } else {
        localStorage.removeItem(SELECTED_DAYS_KEY);
      }
    }
  }, [selectedDays, isInitialized]);

  // Persist showCancelled preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHOW_CANCELLED_KEY, String(showCancelled));
    }
  }, [showCancelled]);

  const { data: boothsResponse, isLoading: isLoadingBooths } = useBooths({ limit: 100, status: true });
  const { data: teachersResponse, isLoading: isLoadingTeachers } = useTeachers({ limit: 100 });
  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({ limit: 100 });
  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({ limit: 100 });
  const { data: classTypesResponse, isLoading: isLoadingClassTypes } = useClassTypes({ limit: 100 });

  const { data: teacherData } = useTeacher(selectedTeacherId);
  const { data: studentData } = useStudent(selectedStudentId);

  const teacherUserId = teacherData?.userId;
  const studentUserId = studentData?.userId;

  const booths = useMemo(() => boothsResponse?.data || [], [boothsResponse]);
  const teachers = useMemo(() => teachersResponse?.data || [], [teachersResponse]);
  const students = useMemo(() => studentsResponse?.data || [], [studentsResponse]);
  const subjects = useMemo(() => subjectsResponse?.data || [], [subjectsResponse]);
  const classTypes = useMemo(() => classTypesResponse?.data || [], [classTypesResponse]);

  // Smart selection aligned with dialog
  const {
    enhancedTeachers,
    enhancedStudents,
    hasTeacherSelected,
    hasStudentSelected,
    isFetchingStudents,
    isLoadingStudents: isLoadingStudentsSmart,
    isFetchingTeachers,
    isLoadingTeachers: isLoadingTeachersSmart,
  } = useSmartSelection({
    selectedTeacherId,
    selectedStudentId,
    selectedSubjectId: undefined,
    activeOnly: true,
    teacherSearchTerm: debouncedTeacherSearchQuery,
    studentSearchTerm: debouncedStudentSearchQuery,
  });

  // Фильтруем только родительские типы для селекта в настройках
  const parentClassTypes = useMemo(() => {
    return classTypes.filter(type => !type.parentId) || [];
  }, [classTypes]);

  const selectedDatesStrings = useMemo(() => {
    return selectedDays.map(day => getDateKey(day));
  }, [selectedDays]);

  const enhancedDayFilters = useMemo(() => {
    const enhanced: Record<string, DayFilters> = {};

    Object.entries(dayFilters).forEach(([dateKey, filters]) => {
      enhanced[dateKey] = { ...filters };
    });

    selectedDatesStrings.forEach(dateStr => {
      if (!enhanced[dateStr]) {
        enhanced[dateStr] = {};
      }
      // Add selectedBranchId to all day filters to ensure proper branch filtering
      if (selectedBranchId) {
        enhanced[dateStr].branchId = selectedBranchId;
      }
      // Apply cancel filter from global toggle
      enhanced[dateStr].includeCancelled = showCancelled;
    });

    return enhanced;
  }, [dayFilters, selectedDatesStrings, selectedBranchId, showCancelled]);

  const classSessionQueries = useMultipleDaysClassSessions(
    selectedDatesStrings,
    enhancedDayFilters
  );

  const classSessionsByDate = useMemo(() => {
    const sessionsByDate: Record<string, ExtendedClassSessionWithRelations[]> = {};

    classSessionQueries.forEach((query, index) => {
      const dateStr = selectedDatesStrings[index];

      if (query.data?.data && Array.isArray(query.data.data)) {
        let arr = query.data.data;
        const filter = enhancedDayFilters[dateStr];
        const ids = filter?.classTypeIds || [];
        if (ids.length > 0) {
          // Exact match only; exclude sessions with null/undefined classTypeId
          arr = arr.filter((s) => s.classTypeId ? ids.includes(s.classTypeId) : false);
        }
        sessionsByDate[dateStr] = arr;
      } else {
        sessionsByDate[dateStr] = [];
      }
    });

    return sessionsByDate;
  }, [classSessionQueries, selectedDatesStrings, enhancedDayFilters]);

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

  // Cross-tab light sync: listen for local broadcast events and refetch affected days
  // Only active days are refetched to avoid visual disruptions
  useEffect(() => {
    const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('calendar-events')
      : null;
    if (!channel) return;
    const handler = (event: MessageEvent) => {
      const payload = event.data as { type?: string; dates?: string[] };
      if (!payload || payload.type !== 'classSessionsChanged') return;
      const dates = payload.dates || [];
      if (dates.length === 0) {
        // Unknown dates – lightly refresh active day queries only
        classSessionQueries.forEach((q) => q.refetch());
        return;
      }
      let any = false;
      dates.forEach((d) => {
        const idx = selectedDatesStrings.indexOf(d);
        if (idx !== -1) {
          classSessionQueries[idx]?.refetch();
          any = true;
        }
      });
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [classSessionQueries, selectedDatesStrings]);

  const handleStartDateChange = useCallback((newStartDate: Date) => {
    const day = startOfDay(newStartDate);
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    setViewStartDate(weekStart);
    setSelectedDays([day]);
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
    // Если тип не выбран, используем "通常授業" по умолчанию
    let defaultClassTypeId = selectedClassTypeId;
    if (!defaultClassTypeId) {
      const defaultType = parentClassTypes.find(type => type.name === '通常授業');
      defaultClassTypeId = defaultType?.classTypeId || '';
    }

    const lessonData = {
      date,
      startTime,
      endTime,
      boothId,
      classTypeId: defaultClassTypeId,
      teacherId: selectedTeacherId,
      studentId: selectedStudentId
    };
    setNewLessonData(lessonData);
    setShowCreateDialog(true);
    setResetSelectionKey(prev => prev + 1);
  }, [selectedClassTypeId, selectedTeacherId, selectedStudentId, parentClassTypes]);

  const handleLessonClick = useCallback((lesson: ExtendedClassSessionWithRelations) => {
    setSelectedLesson(lesson);
    setDialogMode('view');
    setShowLessonDialog(true);
  }, []);

  const handleSaveNewLesson = useCallback(async (lessonData: CreateClassSessionWithConflictsPayload): Promise<{ success: boolean; conflicts?: ConflictResponse }> => {
    try {
      const dateStr = typeof lessonData.date === 'string' ?
        lessonData.date : formatDateToString(lessonData.date);

      const requestBody: Record<string, unknown> = {
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

      // ВАЖНО: Добавляем флаги конфликтов если они есть
      if (lessonData.skipConflicts) {
        requestBody.skipConflicts = true;
      }
      if (lessonData.forceCreate) {
        requestBody.forceCreate = true;
      }
      // NEW: Respect caller preference to include or skip availability-based checks
      if (typeof lessonData.checkAvailability === 'boolean') {
        requestBody.checkAvailability = lessonData.checkAvailability;
      }

      // ВАЖНО: Добавляем sessionActions!!!
      if (lessonData.sessionActions && lessonData.sessionActions.length > 0) {
        requestBody.sessionActions = lessonData.sessionActions;
      }


      const response = await fetch('/api/class-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Selected-Branch': localStorage.getItem('selectedBranchId') || ''
        },
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        let errorData: any = {};

        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          errorData = { message: errorText || `サーバーエラー: ${response.status}` };
        }

        // ВАЖНО: Проверяем на наличие конфликтов
        if (errorData.requiresConfirmation) {
          return {
            success: false,
            conflicts: errorData as ConflictResponse
          };
        }

        // Show error as toast instead of throwing
        let errorMessage = '授業の作成に失敗しました';

        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }

        if (errorData.issues && Array.isArray(errorData.issues)) {
          errorMessage += ': ' + errorData.issues.map((issue: any) => issue.message).join(', ');
        }

        // Show appropriate toast based on status code
        if (response.status === 409) {
          // Conflict error - show as warning
          toast.warning(errorMessage || '同じ講師、日付、時間の授業が既に存在します');
        } else if (response.status === 400) {
          // Validation error
          toast.error(errorMessage || '入力データに問題があります');
        } else {
          // Other errors
          toast.error(errorMessage || `エラー ${response.status}: ${response.statusText}`);
        }

        return { success: false };
      }

      // Parse response JSON if available
      let createdPayload: any = null;
      if (contentType && contentType.includes("application/json")) {
        try {
          createdPayload = await response.json();
        } catch (parseError) {
          console.warn("応答のパースエラー:", parseError);
        }
      }

      // Show generic success toast (no filter-specific messaging)
      toast.success('授業が正常に作成されました');

      // Immediate local cache insert for matching day + filters (no auto-scroll)
      try {
        const createdList: any[] = Array.isArray(createdPayload?.data) ? createdPayload.data : [];
        // Support single-create path too
        const newlyCreated = createdList.length ? createdList : [];

        // Map of dateKey -> created sessions for that date
        const byDate = new Map<string, any[]>();
        newlyCreated.forEach((s) => {
          const d = typeof s?.date === 'string' ? s.date : '';
          if (!d) return;
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(s);
        });

        if (byDate.size > 0) {
          const entries = qc.getQueriesData<any>({ queryKey: ['classSessions'] });
          for (const [key, current] of entries) {
            if (!Array.isArray(key)) continue;
            if (key[0] !== 'classSessions' || key[1] !== 'byDate') continue;
            const dateStr = key[2] as string;
            const filterObj = (key[3] || {}) as DayFilters;
            const createdForDate = byDate.get(dateStr);
            if (!createdForDate || !current) continue;

            const matchesFilter = (sess: any) => {
              if (filterObj.teacherId && sess.teacherId !== filterObj.teacherId) return false;
              if (filterObj.studentId && sess.studentId !== filterObj.studentId) return false;
              if (filterObj.subjectId && sess.subjectId !== filterObj.subjectId) return false;
              if (filterObj.branchId && sess.branchId !== filterObj.branchId) return false;
              // includeCancelled is handled server-side; created sessions are not cancelled
              return true;
            };

            const toInsert = createdForDate.filter(matchesFilter);
            if (toInsert.length === 0) continue;

            if (current?.data && Array.isArray(current.data)) {
              // Avoid duplicate insert if server already returned (race)
              const existingIds = new Set(current.data.map((s: any) => s.classId));
              const merged = [
                ...toInsert.filter((s) => !existingIds.has(s.classId)),
                ...current.data,
              ];
              qc.setQueryData(key, {
                ...current,
                data: merged,
                pagination: {
                  ...current.pagination,
                  total: (current.pagination?.total || merged.length),
                },
              });
            }
          }
        }
      } catch (_) {
        // Best-effort; ignore cache update errors
      }

      // Light broadcast so same-user tabs refresh. For recurring creates, emit all created dates.
      try {
        const { broadcastClassSessionsChanged } = await import('@/lib/calendar-broadcast');
        const createdDates = Array.isArray(createdPayload?.data)
          ? Array.from(
              new Set(
                (createdPayload.data as any[])
                  .map((s) => (typeof s?.date === 'string' ? s.date.split('T')[0] : ''))
                  .filter((d) => typeof d === 'string' && d.length > 0)
              )
            )
          : [];
        if (createdDates.length > 0) {
          broadcastClassSessionsChanged(createdDates as string[]);
        } else {
          const dateKey = typeof requestBody.date === 'string' ? requestBody.date : undefined;
          if (dateKey) broadcastClassSessionsChanged([dateKey]); else broadcastClassSessionsChanged();
        }
      } catch {}

      // Background refetch as fallback
      refreshData();
      setNewLessonData(null);

      return { success: true };

    } catch (error) {
      console.error('Error creating lesson:', error);

      // Check if this is a conflict error (in case error contains conflict data)
      if (error instanceof Error && (error as any).conflicts) {
        return {
          success: false,
          conflicts: (error as any).conflicts
        };
      }

      // Network or other errors - show toast
      if (error instanceof Error) {
        toast.error(error.message || 'ネットワークエラーが発生しました');
      } else {
        toast.error('予期しないエラーが発生しました');
      }

      return { success: false };
    }
  }, [refreshData]);

  const handleUpdateLesson = useCallback(() => {
    setShowLessonDialog(false);
    refreshData();
    setSelectedLesson(null);
  }, [refreshData]);

  const handleDeleteLesson = useCallback(() => {
    setShowLessonDialog(false);
    refreshData();
    setSelectedLesson(null);
  }, [refreshData]);

  const handleGlobalAvailabilityModeChange = useCallback((checked: boolean) => {
    const newMode: AvailabilityMode = checked ? 'regular-only' : 'with-special';
    setGlobalAvailabilityMode(newMode);

    const updatedSettings: Record<string, AvailabilityMode> = {};
    selectedDays.forEach(day => {
      updatedSettings[getDateKey(day)] = newMode;
    });
    setDayAvailabilitySettings(updatedSettings);
  }, [selectedDays]);

  const handleDayAvailabilityModeChange = useCallback((dateKey: string, mode: AvailabilityMode) => {
    setDayAvailabilitySettings(prev => ({
      ...prev,
      [dateKey]: mode
    }));
  }, []);

  const getAvailabilityModeForDay = useCallback((dateKey: string): AvailabilityMode => {
    return dayAvailabilitySettings[dateKey] || globalAvailabilityMode;
  }, [dayAvailabilitySettings, globalAvailabilityMode]);

  // Items для родительских типов уроков (только те, что без parentId)
  const classTypeItems: SearchableSelectItem[] = parentClassTypes.map((type) => ({
    value: type.classTypeId,
    label: type.name,
  }));

  const teacherComboItems: CompatibilityComboboxItem[] = enhancedTeachers
    .map((teacher) => {
      let description = '';
      let matchingSubjectsCount = 0;
      let partialMatchingSubjectsCount = 0;

      if (teacher.compatibilityType === 'perfect') {
        description = `${teacher.matchingSubjectsCount}件の完全一致`;
        matchingSubjectsCount = teacher.matchingSubjectsCount;
        if (teacher.partialMatchingSubjectsCount > 0) {
          description += `, ${teacher.partialMatchingSubjectsCount}件の部分一致`;
          partialMatchingSubjectsCount = teacher.partialMatchingSubjectsCount;
        }
      } else if (teacher.compatibilityType === 'subject-only') {
        description = `${teacher.partialMatchingSubjectsCount}件の部分一致`;
        partialMatchingSubjectsCount = teacher.partialMatchingSubjectsCount;
      } else if (teacher.compatibilityType === 'mismatch') {
        description = '共通科目なし';
      } else if (teacher.compatibilityType === 'teacher-no-prefs') {
        description = '科目設定なし';
      } else if (teacher.compatibilityType === 'student-no-prefs') {
        description = '生徒の設定なし（全対応可）';
      }

      const keywords = [teacher.name, teacher.kanaName, teacher.email, teacher.username]
        .filter((k): k is string => Boolean(k))
        .map((k) => k.toLowerCase());

      return {
        value: teacher.teacherId,
        label: teacher.name,
        description,
        compatibilityType: teacher.compatibilityType,
        matchingSubjectsCount,
        partialMatchingSubjectsCount,
        keywords,
      } as CompatibilityComboboxItem;
    })
    .sort((a, b) => {
      const priorityDiff = getCompatibilityPriority(b.compatibilityType) - getCompatibilityPriority(a.compatibilityType);
      if (priorityDiff !== 0) return priorityDiff;
      const labelA = typeof a.label === 'string' ? a.label : String(a.label ?? '');
      const labelB = typeof b.label === 'string' ? b.label : String(b.label ?? '');
      return labelA.localeCompare(labelB, 'ja');
    });

  const studentComboItems: CompatibilityComboboxItem[] = enhancedStudents
    .map((student) => {
      let description = '';
      let matchingSubjectsCount = 0;
      let partialMatchingSubjectsCount = 0;

      if (student.compatibilityType === 'perfect') {
        description = `${student.matchingSubjectsCount}件の完全一致`;
        matchingSubjectsCount = student.matchingSubjectsCount;
        if (student.partialMatchingSubjectsCount > 0) {
          description += `, ${student.partialMatchingSubjectsCount}件の部分一致`;
          partialMatchingSubjectsCount = student.partialMatchingSubjectsCount;
        }
      } else if (student.compatibilityType === 'subject-only') {
        description = `${student.partialMatchingSubjectsCount}件の部分一致`;
        partialMatchingSubjectsCount = student.partialMatchingSubjectsCount;
      } else if (student.compatibilityType === 'mismatch') {
        description = '共通科目なし';
      } else if (student.compatibilityType === 'student-no-prefs') {
        description = '科目設定なし';
      } else if (student.compatibilityType === 'teacher-no-prefs') {
        description = '講師の設定なし（全対応可）';
      }

      const keywords = [student.name, student.kanaName, student.email, student.username]
        .filter((k): k is string => Boolean(k))
        .map((k) => k.toLowerCase());

      return {
        value: student.studentId,
        label: student.name,
        description,
        compatibilityType: student.compatibilityType,
        matchingSubjectsCount,
        partialMatchingSubjectsCount,
        keywords,
      } as CompatibilityComboboxItem;
    })
    .sort((a, b) => {
      const priorityDiff = getCompatibilityPriority(b.compatibilityType) - getCompatibilityPriority(a.compatibilityType);
      if (priorityDiff !== 0) return priorityDiff;
      const labelA = typeof a.label === 'string' ? a.label : String(a.label ?? '');
      const labelB = typeof b.label === 'string' ? b.label : String(b.label ?? '');
      return labelA.localeCompare(labelB, 'ja');
    });

  const clearClassType = () => setSelectedClassTypeId('');
  const clearTeacher = () => setSelectedTeacherId('');
  const clearStudent = () => setSelectedStudentId('');

  const clearAllSelections = () => {
    setSelectedClassTypeId('');
    setSelectedTeacherId('');
    setSelectedStudentId('');
  };

  const hasActiveSelections = Boolean(selectedClassTypeId || selectedTeacherId || selectedStudentId);
  const canCreateLessons = Boolean(selectedTeacherId && selectedStudentId);

  if (!selectedBranchId) {
    return (
      <div className="flex justify-center p-8 text-muted-foreground">
        スケジュールを表示するには、ブランチを選択してください。
      </div>
    );
  }

  if (!isInitialized) {
    return <div className="flex justify-center p-8 text-foreground dark:text-foreground">初期化中...</div>;
  }

  if (isLoadingData) {
    return <div className="flex justify-center p-8 text-foreground dark:text-foreground">データを読み込み中...</div>;
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="bg-background border rounded-lg p-4 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">授業作成の設定</h3>

          {(selectedTeacherId || selectedStudentId) && (
            <div className="flex-shrink-0">
              <div className="text-xs text-muted-foreground mb-1">空き時間表示:</div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-400/40 border border-green-300"></div>
                  <span className="text-green-700 dark:text-green-300">両方OK</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-blue-400/40 border border-blue-300"></div>
                  <span className="text-blue-700 dark:text-blue-300">講師のみ</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-yellow-400/40 border border-yellow-300"></div>
                  <span className="text-yellow-700 dark:text-yellow-300">生徒のみ</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
          <div className="flex items-center space-x-2">
            <Switch
              id="global-availability-mode"
              checked={globalAvailabilityMode === 'regular-only'}
              onCheckedChange={handleGlobalAvailabilityModeChange}
            />
            <Label htmlFor="global-availability-mode" className="text-sm font-medium">
              通常希望のみ表示
            </Label>
          </div>
          <div className="text-xs text-muted-foreground">
            {globalAvailabilityMode === 'regular-only'
              ? '特別希望を除外して通常希望のみ表示します'
              : '特別希望を優先して表示します（デフォルト）'
            }
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Switch
              id="show-cancelled-toggle"
              checked={showCancelled}
              onCheckedChange={setShowCancelled}
            />
            <Label htmlFor="show-cancelled-toggle" className="text-sm font-medium">
              キャンセル授業を表示
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">授業タイプ（基本）</label>
              <SearchableSelect
                value={selectedClassTypeId}
                onValueChange={setSelectedClassTypeId}
                items={classTypeItems}
                placeholder="基本タイプを選択"
                searchPlaceholder="基本タイプを検索..."
                emptyMessage="基本タイプが見つかりません"
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
              <label className="text-sm font-medium mb-1 block">
                講師
                {hasStudentSelected && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({enhancedTeachers.filter((t: EnhancedTeacher) => t.compatibilityType === 'perfect').length} 完全一致)
                  </span>
                )}
              </label>
              <Combobox<CompatibilityComboboxItem>
                items={teacherComboItems}
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
                placeholder="講師を選択"
                searchPlaceholder="講師を検索..."
                emptyMessage="講師が見つかりません"
                disabled={false}
                clearable
                searchValue={teacherSearchQuery}
                onSearchChange={setTeacherSearchQuery}
                loading={isLoadingTeachersSmart || isFetchingTeachers}
                triggerClassName="h-10"
                onOpenChange={(open) => { if (!open) setTeacherSearchQuery(''); }}
                renderItem={renderCompatibilityComboboxItem}
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
              <label className="text-sm font-medium mb-1 block">
                生徒
                {hasTeacherSelected && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({enhancedStudents.filter((s: EnhancedStudent) => s.compatibilityType === 'perfect').length} 完全一致)
                  </span>
                )}
              </label>
              <Combobox<CompatibilityComboboxItem>
                items={studentComboItems}
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
                placeholder="生徒を選択"
                searchPlaceholder="生徒を検索..."
                emptyMessage="生徒が見つかりません"
                disabled={false}
                clearable
                searchValue={studentSearchQuery}
                onSearchChange={setStudentSearchQuery}
                loading={isLoadingStudentsSmart || isFetchingStudents}
                triggerClassName="h-10"
                onOpenChange={(open) => { if (!open) setStudentSearchQuery(''); }}
                renderItem={renderCompatibilityComboboxItem}
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
            ) : selectedTeacherId && selectedStudentId ? (
              '授業タイプが選択されていません。作成時は「通常授業」が使用されます。'
            ) : (
              '授業を作成するには、講師と生徒を選択してください。授業タイプは任意です（未選択時は「通常授業」）。'
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
        <div className="flex items-center gap-6"/>

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
          const availabilityMode = getAvailabilityModeForDay(dateKey);

          const queryIndex = selectedDatesStrings.indexOf(dateKey);
          const isFetchingThisDay = queryIndex !== -1 ? classSessionQueries[queryIndex].isFetching : false;
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
                availabilityMode={availabilityMode}
                onAvailabilityModeChange={(mode) => handleDayAvailabilityModeChange(dateKey, mode)}
                isFetching={isFetchingThisDay}
                preserveScrollOnFetch
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
