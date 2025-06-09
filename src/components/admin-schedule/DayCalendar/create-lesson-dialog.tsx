import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from '@/lib/fetcher';
import {
  CreateClassSessionPayload,
  NewClassSessionData,
  formatDateToString
} from './types/class-session';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { useSmartSelection, EnhancedTeacher, EnhancedStudent, SubjectCompatibility } from '@/hooks/useSmartSelection';

function DateRangePicker({
  dateRange,
  setDateRange,
  placeholder = "期間を選択"
}: {
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);

  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTempRange(dateRange);
    }
  };

  const handleApply = () => {
    setDateRange(tempRange);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "yyyy年MM月dd日", { locale: ja })} - {format(dateRange.to, "yyyy年MM月dd日", { locale: ja })}
              </>
            ) : (
              format(dateRange.from, "yyyy年MM月dd日", { locale: ja })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        style={{
          zIndex: 9999,
          position: 'relative',
          pointerEvents: 'auto'
        }}
        align="start"
        side="bottom"
        sideOffset={8}
        forceMount
      >
        <div className="flex flex-col">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            locale={ja}
            showOutsideDays={false}
            className="rounded-md border-b pointer-events-auto"
          />
          <div className="flex justify-end p-2 bg-background border-t">
            <div className="text-sm mr-auto text-muted-foreground">
              {tempRange?.from && tempRange?.to && (
                <>
                  {format(tempRange.from, "yyyy年MM月dd日", { locale: ja })} - {format(tempRange.to, "yyyy年MM月dd日", { locale: ja })}
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!tempRange?.from || !tempRange?.to}
            >
              適用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { Teacher } from '@/hooks/useTeacherQuery';
import { Student } from '@/hooks/useStudentQuery';

interface Booth {
  boothId: string;
  name: string;
}

interface ExtendedNewClassSessionData extends NewClassSessionData {
  classTypeId?: string;
  teacherId?: string;
  studentId?: string;
}

type CreateLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonData: ExtendedNewClassSessionData;
  onSave: (data: CreateClassSessionPayload) => Promise<void> | void;
  booths: Booth[];
  preselectedClassTypeId?: string;
  preselectedTeacherId?: string;
  preselectedStudentId?: string;
  teacherName?: string;
  studentName?: string;
  teacherData?: Teacher | null;
  studentData?: Student | null;
};

interface ClassType {
  classTypeId: string;
  name: string;
}

export const CreateLessonDialog: React.FC<CreateLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonData,
  onSave,
  booths,
  preselectedClassTypeId,
  preselectedTeacherId,
  preselectedStudentId,
  teacherName = '',
  studentName = '',
  teacherData,
  studentData
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [subjectId, setSubjectId] = useState<string>('');
  const [subjectTypeId, setSubjectTypeId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [isLoadingClassTypes, setIsLoadingClassTypes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [regularClassTypeId, setRegularClassTypeId] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const STORAGE_KEY = 'create-lesson-dialog-persistent-fields';

  // Use smart selection hook with enhanced data
  const {
    enhancedTeachers,
    enhancedStudents,
    enhancedSubjects,
    filteredSubjectTypes,
    getCompatibilityInfo,
    hasTeacherSelected,
    hasStudentSelected
  } = useSmartSelection({
    selectedTeacherId,
    selectedStudentId,
    selectedSubjectId: subjectId
  });

  // Check if subject selection is meaningful
  const canSelectSubject = useMemo(() => {
    return Boolean(selectedTeacherId || selectedStudentId);
  }, [selectedTeacherId, selectedStudentId]);

  // Create enhanced items for SearchableSelect components
  const teacherItems: SearchableSelectItem[] = enhancedTeachers.map((teacher) => {
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

    return {
      value: teacher.teacherId,
      label: teacher.name,
      description,
      compatibilityType: teacher.compatibilityType,
      matchingSubjectsCount,
      partialMatchingSubjectsCount
    };
  });

  const studentItems: SearchableSelectItem[] = enhancedStudents.map((student) => {
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
      description = '教師の設定なし（全対応可）';
    }

    return {
      value: student.studentId,
      label: student.name,
      description,
      compatibilityType: student.compatibilityType,
      matchingSubjectsCount,
      partialMatchingSubjectsCount
    };
  });

  const subjectItems: SearchableSelectItem[] = enhancedSubjects.map((subject) => {
    let description = '';
    
    switch (subject.compatibilityType) {
      case 'perfect':
        description = '完全一致（科目・レベル両方）';
        break;
      case 'subject-only':
        description = '部分一致（科目のみ・レベル違い）';
        break;
      case 'teacher-only':
        description = '教師のみ対応';
        break;
      case 'student-only':
        description = '生徒のみ希望';
        break;
      case 'mismatch':
        description = '対応なし';
        break;
      case 'no-preferences':
        description = '全員利用可能';
        break;
    }

    return {
      value: subject.subjectId,
      label: subject.name,
      description,
      compatibilityType: subject.compatibilityType
    };
  });

  const subjectTypeItems: SearchableSelectItem[] = filteredSubjectTypes.map((type) => ({
    value: type.subjectTypeId,
    label: type.name,
  }));

  // Get compatibility info for display
  const compatibilityInfo = getCompatibilityInfo();

  // Updated handlers - no more filtering, just selection
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const handleSubjectChange = (subjectId: string) => {
    setSubjectId(subjectId);
    setSubjectTypeId(''); // Still reset subject type when subject changes
  };

  // Clear functions
  const clearTeacher = () => {
    setSelectedTeacherId('');
  };

  const clearStudent = () => {
    setSelectedStudentId('');
  };

  const clearSubject = () => {
    setSubjectId('');
    setSubjectTypeId('');
  };

  const clearSubjectType = () => {
    setSubjectTypeId('');
  };

  useEffect(() => {
    const loadClassTypes = async () => {
      setIsLoadingClassTypes(true);
      try {
        const response = await fetcher<{ data: ClassType[] }>('/api/class-types');
        setClassTypes(response.data || []);

        const regularType = response.data.find(type => type.name === '通常授業');
        if (regularType) {
          setRegularClassTypeId(regularType.classTypeId);
        }
      } catch (err) {
        console.error("Error loading class types:", err);
        setError("授業タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingClassTypes(false);
      }
    };

    if (open) {
      loadClassTypes();
    }
  }, [open]);

  useEffect(() => {
    if (open && classTypes.length > 0 && regularClassTypeId) {
      const initializeDialog = () => {
        setIsInitializing(true);

        const correctClassTypeId = preselectedClassTypeId || lessonData.classTypeId || regularClassTypeId || '';
        const correctIsRecurring = correctClassTypeId === regularClassTypeId;

        const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;

        let savedData = null;
        try {
          const savedDataStr = localStorage.getItem(STORAGE_KEY);
          if (savedDataStr) {
            savedData = JSON.parse(savedDataStr);
          }
        } catch (error) {
          console.error("Error loading saved data:", error);
        }

        setSelectedClassTypeId(correctClassTypeId);
        setSelectedTeacherId(preselectedTeacherId || '');
        setSelectedStudentId(preselectedStudentId || '');
        setIsRecurring(correctIsRecurring);
        setSubjectId('');
        setSubjectTypeId('');
        setNotes('');
        setSelectedDays(savedData?.selectedDays || []);
        setDateRange({ from: lessonDate, to: correctIsRecurring ? undefined : undefined });
        setError(null);
        setValidationErrors([]);

        setIsInitializing(false);
      };

      initializeDialog();
    } else if (!open) {
      setIsInitializing(true);
    }
  }, [open, classTypes.length, regularClassTypeId, lessonData, preselectedClassTypeId, preselectedTeacherId, preselectedStudentId]);

  useEffect(() => {
    if (open && !isInitializing) {
      const persistentData = {
        selectedDays,
        selectedTeacherId,
        selectedStudentId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentData));
    }
  }, [selectedDays, selectedTeacherId, selectedStudentId, open, isInitializing]);

  useEffect(() => {
    if (open && !isRecurring) {
      const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;
      setDateRange({ from: lessonDate, to: undefined });
    }
  }, [open, lessonData.date, isRecurring]);

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!selectedClassTypeId) {
      errors.push("授業のタイプを選択してください。");
    }

    if (!selectedTeacherId) {
      errors.push("教師を選択してください。");
    }

    if (!selectedStudentId) {
      errors.push("生徒を選択してください。");
    }

    if (!subjectId) {
      errors.push("科目を選択してください。");
    }

    if (!subjectTypeId) {
      errors.push("科目タイプを選択してください。");
    }

    if (isRecurring) {
      if (!dateRange?.from) {
        errors.push("通常授業の場合は期間の開始日を選択してください。");
      }
      if (!dateRange?.to) {
        errors.push("通常授業の場合は期間の終了日を選択してください。");
      }
    } else {
      if (!dateRange?.from) {
        errors.push("期間の開始日を選択してください。");
      }
    }

    return errors;
  };

  const canSubmit = useMemo(() => {
    if (isInitializing) return false;
    
    const hasRequiredFields = selectedClassTypeId && 
                             selectedTeacherId && 
                             selectedStudentId && 
                             subjectId && 
                             subjectTypeId;
    
    if (!hasRequiredFields) return false;
    
    if (isRecurring) {
      return dateRange?.from && dateRange?.to;
    } else {
      return dateRange?.from;
    }
  }, [isInitializing, selectedClassTypeId, selectedTeacherId, selectedStudentId, subjectId, subjectTypeId, isRecurring, dateRange]);

  const handleSubmit = () => {
    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    const payload: CreateClassSessionPayload = {
      date: formatDateToString(lessonData.date),
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
      boothId: lessonData.boothId,
      subjectId: subjectId,
      teacherId: selectedTeacherId,
      studentId: selectedStudentId,
      notes: notes || "",
      classTypeId: selectedClassTypeId
    };

    if (isRecurring && dateRange?.from) {
      payload.isRecurring = true;
      payload.startDate = format(dateRange.from, 'yyyy-MM-dd');

      if (dateRange.to) {
        payload.endDate = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (selectedDays.length > 0) {
        payload.daysOfWeek = selectedDays;
      } else {
        const dayOfWeek = dateRange.from.getDay();
        payload.daysOfWeek = [dayOfWeek];
      }
    }

    console.log("Payload from dialog:", JSON.stringify(payload, null, 2));

    onSave(payload);
    onOpenChange(false);
  };

  const handleReset = () => {
    const correctClassTypeId = preselectedClassTypeId || regularClassTypeId || '';
    const correctIsRecurring = correctClassTypeId === regularClassTypeId;
    const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;

    setSelectedClassTypeId(correctClassTypeId);
    setSelectedTeacherId(preselectedTeacherId || '');
    setSelectedStudentId(preselectedStudentId || '');
    setIsRecurring(correctIsRecurring);
    setSubjectId('');
    setSubjectTypeId('');
    setNotes('');
    setSelectedDays([]);
    setDateRange({ from: lessonDate, to: undefined });

    localStorage.removeItem(STORAGE_KEY);
    setError(null);
    setValidationErrors([]);
  };

  const isLoading = isLoadingClassTypes;

  const daysOfWeek = [
    { label: '月', value: 1 },
    { label: '火', value: 2 },
    { label: '水', value: 3 },
    { label: '木', value: 4 },
    { label: '金', value: 5 },
    { label: '土', value: 6 },
    { label: '日', value: 0 }
  ];

  const selectedClassType = classTypes.find(type => type.classTypeId === selectedClassTypeId);

  if (isInitializing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>授業の作成</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">読み込み中...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>授業の作成</DialogTitle>
          <DialogDescription>
            新しい授業の情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-1 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--border)) transparent'
          }}
        >
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">日付</label>
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {format(typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date, 'yyyy年MM月dd日', { locale: ja })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">教室</label>
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {booths.find(booth => booth.boothId === lessonData.boothId)?.name || lessonData.boothId}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">開始時間</label>
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lessonData.startTime}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">終了時間</label>
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lessonData.endTime}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">授業のタイプ</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {selectedClassType?.name || '未選択'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Enhanced Teacher Select */}
              <div>
                <label htmlFor="teacher-select" className="text-sm font-medium mb-1 block text-foreground">
                  教師 <span className="text-destructive">*</span>
                  {hasStudentSelected && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({enhancedTeachers.filter((t: EnhancedTeacher) => t.compatibilityType === 'perfect').length} 完全一致)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={selectedTeacherId}
                      onValueChange={handleTeacherChange}
                      items={teacherItems}
                      placeholder="教師を選択"
                      searchPlaceholder="教師を検索..."
                      emptyMessage="教師が見つかりません"
                      showCompatibilityIcons={hasStudentSelected}
                    />
                  </div>
                  {selectedTeacherId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearTeacher}
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Enhanced Student Select */}
              <div>
                <label htmlFor="student-select" className="text-sm font-medium mb-1 block text-foreground">
                  生徒 <span className="text-destructive">*</span>
                  {hasTeacherSelected && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({enhancedStudents.filter((s: EnhancedStudent) => s.compatibilityType === 'perfect').length} 完全一致)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={selectedStudentId}
                      onValueChange={handleStudentChange}
                      items={studentItems}
                      placeholder="生徒を選択"
                      searchPlaceholder="生徒を検索..."
                      emptyMessage="生徒が見つかりません"
                      showCompatibilityIcons={hasTeacherSelected}
                    />
                  </div>
                  {selectedStudentId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearStudent}
                      className="px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Compatibility Indicator */}
            {compatibilityInfo && (
              <div className={`text-xs p-3 rounded-md border ${
                compatibilityInfo.compatibilityType === 'perfect' 
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' 
                  : compatibilityInfo.compatibilityType === 'subject-only'
                  ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800'
                  : compatibilityInfo.compatibilityType === 'mismatch'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
              }`}>
                <div className="flex items-center gap-2">
                  {compatibilityInfo.compatibilityType === 'perfect' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {compatibilityInfo.compatibilityType === 'subject-only' && (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                  {compatibilityInfo.compatibilityType === 'mismatch' && (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  {(compatibilityInfo.compatibilityType === 'teacher-only' || 
                    compatibilityInfo.compatibilityType === 'student-only' ||
                    compatibilityInfo.compatibilityType === 'no-preferences') && (
                    <Users className="h-4 w-4 text-blue-600" />
                  )}
                  <span>{compatibilityInfo.message}</span>
                </div>
              </div>
            )}

            {isRecurring && (
              <div className="space-y-3 p-3 rounded-md border border-input bg-muted/30">
                <div>
                  <label className="text-sm font-medium mb-1 block text-foreground">期間 <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <DateRangePicker
                      dateRange={dateRange}
                      setDateRange={setDateRange}
                      placeholder="期間を選択"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">曜日を選択</label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm
                          transition-colors duration-200
                          ${selectedDays.includes(day.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground border border-input'
                          }
                        `}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {selectedDays.length === 0
                      ? "曜日が選択されていない場合、選択した日付の曜日が使用されます。"
                      : `選択された曜日: ${selectedDays.map(d => daysOfWeek.find(day => day.value === d)?.label).join(', ')}`
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Subject Select */}
            <div>
              <label htmlFor="subject-select" className="text-sm font-medium mb-1 block text-foreground">
                科目 <span className="text-destructive">*</span>
                {!canSelectSubject && (
                  <span className="text-xs text-amber-600 dark:text-amber-500 ml-2">
                    (推奨: 教師と生徒を選択すると適合度が表示されます)
                  </span>
                )}
                {canSelectSubject && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({enhancedSubjects.filter((s: SubjectCompatibility) => s.compatibilityType === 'perfect').length} 完全一致, {enhancedSubjects.length} 総数)
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={subjectId}
                    onValueChange={handleSubjectChange}
                    items={subjectItems}
                    placeholder="科目を選択"
                    searchPlaceholder="科目を検索..."
                    emptyMessage="科目が見つかりません"
                    showCompatibilityIcons={canSelectSubject}
                  />
                </div>
                {subjectId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSubject}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Subject Type Select */}
            <div>
              <label htmlFor="subject-type-select" className="text-sm font-medium mb-1 block text-foreground">
                科目タイプ <span className="text-destructive">*</span>
                {!subjectId && (
                  <span className="text-xs text-amber-600 dark:text-amber-500 ml-2">
                    (科目を先に選択してください)
                  </span>
                )}
                {subjectId && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({filteredSubjectTypes.length} 利用可能)
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={subjectTypeId}
                    onValueChange={setSubjectTypeId}
                    items={subjectTypeItems}
                    placeholder={
                      !subjectId
                        ? "先に科目を選択してください"
                        : filteredSubjectTypes.length === 0
                        ? "利用可能な科目タイプがありません"
                        : "科目タイプを選択"
                    }
                    searchPlaceholder="科目タイプを検索..."
                    emptyMessage="科目タイプが見つかりません"
                    disabled={!subjectId || filteredSubjectTypes.length === 0}
                  />
                </div>
                {subjectTypeId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSubjectType}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium mb-1 block text-foreground">メモ</label>
              <textarea
                id="notes"
                className="w-full min-h-[60px] p-2 border rounded-md bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors border-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="授業に関するメモを入力してください"
              />
            </div>

            {error && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <div className="font-medium mb-2">入力内容を確認してください:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-destructive/30 focus:outline-none"
              onClick={handleReset}
            >
              リセット
            </Button>
            <Button
              className="ml-auto transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
              onClick={handleSubmit}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? "読み込み中..." : "作成"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};