import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from '@/lib/fetcher';
import {
  NewClassSessionData,
  formatDateToString,
  ConflictResponse,
  CreateClassSessionWithConflictsPayload,
  SessionAction,
} from './types/class-session';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { TimeInput } from '@/components/ui/time-input';
import { useSmartSelection, EnhancedTeacher, EnhancedStudent, SubjectCompatibility } from '@/hooks/useSmartSelection';
import { useAvailability } from './availability-layer';
import { ConflictResolutionTable } from './conflict-resolution-table';
import { SimpleDateRangePicker } from '../../fix-date-range-picker/simple-date-range-picker';

import { Teacher } from '@/hooks/useTeacherQuery';
import { Student } from '@/hooks/useStudentQuery';
import { useDebounce } from '@/hooks/use-debounce';
import { Combobox, ComboboxItem, ComboboxRenderItemProps } from '@/components/ui/combobox';

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
  onSave: (data: CreateClassSessionWithConflictsPayload) => Promise<{ success: boolean; conflicts?: ConflictResponse }>;
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
  parentId?: string | null;
}

type CompatibilityType =
  | EnhancedTeacher['compatibilityType']
  | EnhancedStudent['compatibilityType']
  | SubjectCompatibility['compatibilityType'];

type CompatibilityComboboxItem = ComboboxItem & {
  description?: string;
  compatibilityType?: CompatibilityType;
  matchingSubjectsCount?: number;
  partialMatchingSubjectsCount?: number;
};

const getCompatibilityIcon = (type?: CompatibilityType) => {
  switch (type) {
    case 'perfect':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'subject-only':
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    case 'teacher-only':
      return <Users className="h-3 w-3 text-blue-500" />;
    case 'student-only':
      return <Users className="h-3 w-3 text-orange-500" />;
    case 'mismatch':
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    case 'teacher-no-prefs':
    case 'student-no-prefs':
    case 'no-teacher-selected':
    case 'no-student-selected':
    case 'no-preferences':
      return <Users className="h-3 w-3 text-muted-foreground" />;
    default:
      return null;
  }
};

const getCompatibilityPriority = (type?: CompatibilityType) => {
  switch (type) {
    case 'perfect':
      return 5;
    case 'subject-only':
      return 4;
    case 'teacher-only':
    case 'student-only':
      return 3;
    case 'teacher-no-prefs':
    case 'student-no-prefs':
      return 2;
    case 'no-preferences':
      return 1;
    case 'mismatch':
      return 0;
    default:
      return -1;
  }
};

const renderCompatibilityComboboxItem = <T extends CompatibilityComboboxItem>({
  item,
  defaultIndicator,
}: ComboboxRenderItemProps<T>) => {
  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center gap-2">
        {getCompatibilityIcon(item.compatibilityType)}
        <span className="flex-1 truncate">{item.label}</span>
        {item.matchingSubjectsCount ? (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
            {item.matchingSubjectsCount}
          </span>
        ) : null}
        {item.partialMatchingSubjectsCount ? (
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800">
            ±{item.partialMatchingSubjectsCount}
          </span>
        ) : null}
        {defaultIndicator}
      </div>
      {item.description && (
        <span className="text-xs text-muted-foreground">{item.description}</span>
      )}
    </div>
  );
};

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

  // Main form states
  const [selectedParentClassTypeId, setSelectedParentClassTypeId] = useState<string>('');
  const [selectedChildClassTypeId, setSelectedChildClassTypeId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBoothId, setSelectedBoothId] = useState<string>(''); // NEW: Booth selector state
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [subjectId, setSubjectId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const debouncedTeacherSearchQuery = useDebounce(teacherSearchQuery, 300);
  const debouncedStudentSearchQuery = useDebounce(studentSearchQuery, 300);

  // Class types and loading states
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [isLoadingClassTypes, setIsLoadingClassTypes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [regularClassTypeId, setRegularClassTypeId] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Conflict resolution states
  const [conflictData, setConflictData] = useState<ConflictResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentPayload, setCurrentPayload] = useState<CreateClassSessionWithConflictsPayload | null>(null);

  // Use smart selection hook with enhanced data
  const {
    enhancedTeachers,
    enhancedStudents,
    enhancedSubjects,
    getCompatibilityInfo,
    hasTeacherSelected,
    hasStudentSelected,
    isFetchingStudents,
    isLoadingStudents,
    isFetchingTeachers,
    isLoadingTeachers,
  } = useSmartSelection({
    selectedTeacherId,
    selectedStudentId,
    selectedSubjectId: subjectId,
    activeOnly: true,
    teacherSearchTerm: debouncedTeacherSearchQuery,
    studentSearchTerm: debouncedStudentSearchQuery,
  });

  // Availability hook
  const { teacherAvailability, studentAvailability } = useAvailability(
    selectedTeacherId || undefined,
    selectedStudentId || undefined,
    typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date,
    Array.from({ length: 57 }, (_, i) => {
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
    })
  );

  // Determine if form should be disabled (when conflicts are shown)
  const isFormDisabled = Boolean(conflictData);

  // Derived states
  const canSelectSubject = useMemo(() => {
    return Boolean(selectedTeacherId || selectedStudentId);
  }, [selectedTeacherId, selectedStudentId]);

  const parentClassTypes = useMemo(() => {
    return classTypes.filter(type => !type.parentId) || [];
  }, [classTypes]);

  const childClassTypes = useMemo(() => {
    if (!selectedParentClassTypeId) return [];
    return classTypes.filter(type => type.parentId === selectedParentClassTypeId) || [];
  }, [classTypes, selectedParentClassTypeId]);

  // Handle date range update from CompactDateRangePicker
  // const handleDateRangeUpdate = (range: DateRange) => {
  //   setDateRange(range);
  // };

  // Handle conflict resolution with new table
  const handleConflictResolution = async (actions: SessionAction[]) => {
    console.log('Received actions in handleConflictResolution:', actions);
    if (!currentPayload) return;

    setIsSubmitting(true);
    try {
      const finalPayload: CreateClassSessionWithConflictsPayload = {
        ...currentPayload,
        sessionActions: actions
      };

      console.log('Final payload with sessionActions:', finalPayload);
      console.log('About to call onSave with finalPayload');

      const result = await onSave(finalPayload);
      if (result.success) {
        setConflictData(null);
        setCurrentPayload(null);
        onOpenChange(false);
      } else if (result.conflicts) {
        setConflictData(result.conflicts);
      }
    } catch (error) {
      console.error('Error handling conflict resolution:', error);
      if (error instanceof Error) {
        toast.error(error.message || '競合解決中にエラーが発生しました');
      } else {
        toast.error('競合解決中にエラーが発生しました');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConflictCancel = () => {
    setConflictData(null);
    setCurrentPayload(null);
  };

  // Create enhanced items for select components (active-only already fetched)
  const teacherItems: CompatibilityComboboxItem[] = enhancedTeachers.map((teacher) => {
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
      .filter((keyword): keyword is string => Boolean(keyword))
      .map((keyword) => keyword.toLowerCase());

    return {
      value: teacher.teacherId,
      label: teacher.name,
      description,
      compatibilityType: teacher.compatibilityType,
      matchingSubjectsCount,
      partialMatchingSubjectsCount,
      keywords,
    };
  }).sort((a, b) => {
    const priorityDiff = getCompatibilityPriority(b.compatibilityType) - getCompatibilityPriority(a.compatibilityType);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const labelA = typeof a.label === 'string' ? a.label : String(a.label ?? '');
    const labelB = typeof b.label === 'string' ? b.label : String(b.label ?? '');
    return labelA.localeCompare(labelB, 'ja');
  });

  const studentItems: CompatibilityComboboxItem[] = enhancedStudents.map((student) => {
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
      .filter((keyword): keyword is string => Boolean(keyword))
      .map((keyword) => keyword.toLowerCase());

    return {
      value: student.studentId,
      label: student.name,
      description,
      compatibilityType: student.compatibilityType,
      matchingSubjectsCount,
      partialMatchingSubjectsCount,
      keywords,
    };
  }).sort((a, b) => {
    const priorityDiff = getCompatibilityPriority(b.compatibilityType) - getCompatibilityPriority(a.compatibilityType);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const labelA = typeof a.label === 'string' ? a.label : String(a.label ?? '');
    const labelB = typeof b.label === 'string' ? b.label : String(b.label ?? '');
    return labelA.localeCompare(labelB, 'ja');
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
        description = '講師のみ対応';
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

  const parentClassTypeItems: SearchableSelectItem[] = parentClassTypes.map((type) => ({
    value: type.classTypeId,
    label: type.name,
  }));

  const childClassTypeItems: SearchableSelectItem[] = childClassTypes.map((type) => ({
    value: type.classTypeId,
    label: type.name,
  }));

  // NEW: Booth items for selector
  const boothItems: SearchableSelectItem[] = booths.map((booth) => ({
    value: booth.boothId,
    label: booth.name,
  }));

  const compatibilityInfo = getCompatibilityInfo();

  // Event handlers
  const handleTeacherChange = (teacherId: string) => {
    if (isFormDisabled) return;
    setSelectedTeacherId(teacherId);
  };

  const handleStudentChange = (studentId: string) => {
    if (isFormDisabled) return;
    setSelectedStudentId(studentId);
  };

  const handleSubjectChange = (subjectId: string) => {
    if (isFormDisabled) return;
    setSubjectId(subjectId);
  };

  const handleBoothChange = (boothId: string) => {
    if (isFormDisabled) return;
    setSelectedBoothId(boothId);
  };

  const handleParentClassTypeChange = (parentTypeId: string) => {
    if (isFormDisabled) return;
    setSelectedParentClassTypeId(parentTypeId);
    setSelectedChildClassTypeId('');

    const parentType = parentClassTypes.find(type => type.classTypeId === parentTypeId);
    if (parentType) {
      const isRegular = parentType.name === '通常授業';
      setIsRecurring(isRegular);
    }
  };

  const handleChildClassTypeChange = (childTypeId: string) => {
    if (isFormDisabled) return;
    setSelectedChildClassTypeId(childTypeId);
  };

  // Clear functions
  const clearTeacher = () => {
    if (isFormDisabled) return;
    setSelectedTeacherId('');
    setTeacherSearchQuery('');
  };
  const clearStudent = () => {
    if (isFormDisabled) return;
    setSelectedStudentId('');
    setStudentSearchQuery('');
  };
  const clearSubject = () => {
    if (isFormDisabled) return;
    setSubjectId('');
  };
  const clearBooth = () => {
    if (isFormDisabled) return;
    setSelectedBoothId('');
  };
  const clearParentClassType = () => {
    if (isFormDisabled) return;
    setSelectedParentClassTypeId('');
    setSelectedChildClassTypeId('');
    setIsRecurring(false);
  };
  const clearChildClassType = () => {
    if (isFormDisabled) return;
    setSelectedChildClassTypeId('');
  };

  // Load class types effect
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

  // Initialize dialog effect
  useEffect(() => {
    if (open && classTypes.length > 0 && regularClassTypeId) {
      const initializeDialog = () => {
        setIsInitializing(true);

        let correctParentClassTypeId = '';
        let correctChildClassTypeId = '';

        if (preselectedClassTypeId) {
          const preselectedType = classTypes.find(type => type.classTypeId === preselectedClassTypeId);
          if (preselectedType) {
            if (!preselectedType.parentId) {
              correctParentClassTypeId = preselectedClassTypeId;
            } else {
              correctParentClassTypeId = preselectedType.parentId;
              correctChildClassTypeId = preselectedClassTypeId;
            }
          }
        } else if (lessonData.classTypeId) {
          const lessonType = classTypes.find(type => type.classTypeId === lessonData.classTypeId);
          if (lessonType) {
            if (!lessonType.parentId) {
              correctParentClassTypeId = lessonData.classTypeId;
            } else {
              correctParentClassTypeId = lessonType.parentId;
              correctChildClassTypeId = lessonData.classTypeId;
            }
          }
        } else {
          correctParentClassTypeId = regularClassTypeId;
        }

        const correctIsRecurring = correctParentClassTypeId === regularClassTypeId;
        const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;

        setSelectedParentClassTypeId(correctParentClassTypeId);
        setSelectedChildClassTypeId(correctChildClassTypeId);
        setSelectedTeacherId(preselectedTeacherId || '');
        setSelectedStudentId(preselectedStudentId || '');
        setSelectedBoothId(lessonData.boothId || ''); // NEW: Initialize booth state
        setIsRecurring(correctIsRecurring);
        setSubjectId('');
        setNotes('');
        setStartTime(lessonData.startTime);
        setEndTime(lessonData.endTime);
        setDateRange({ from: lessonDate, to: correctIsRecurring ? undefined : undefined });

        const dayOfWeek = lessonDate.getDay();
        setSelectedDays([dayOfWeek]);

        setError(null);
        setValidationErrors([]);
        setIsInitializing(false);
      };

      initializeDialog();
    } else if (!open) {
      setIsInitializing(true);
      setConflictData(null);
      setCurrentPayload(null);
    }
  }, [open, classTypes.length, regularClassTypeId, lessonData, preselectedClassTypeId, preselectedTeacherId, preselectedStudentId]);

  useEffect(() => {
    if (!open) {
      setTeacherSearchQuery('');
      setStudentSearchQuery('');
    }
  }, [open]);

  // Update date range for non-recurring lessons
  useEffect(() => {
    if (open && !isRecurring) {
      const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;
      setDateRange({ from: lessonDate, to: undefined });
    }
  }, [open, lessonData.date, isRecurring]);

  const handleDayToggle = (day: number) => {
    if (isFormDisabled) return;
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

    if (!selectedParentClassTypeId) {
      errors.push("授業の基本タイプを選択してください。");
    }

    if (!selectedTeacherId) {
      errors.push("講師を選択してください。");
    }

    if (!selectedStudentId) {
      errors.push("生徒を選択してください。");
    }

    if (!subjectId) {
      errors.push("科目を選択してください。");
    }

    // NEW: Booth validation
    const finalBoothId = lessonData.boothId || selectedBoothId;
    if (!finalBoothId) {
      errors.push("ブースを選択してください。");
    }

    if (!startTime) {
      errors.push("開始時間を選択してください。");
    }

    if (!endTime) {
      errors.push("終了時間を選択してください。");
    }

    if (startTime && endTime && startTime >= endTime) {
      errors.push("終了時間は開始時間より後に設定してください。");
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

    const finalBoothId = lessonData.boothId || selectedBoothId;
    const hasRequiredFields = selectedParentClassTypeId &&
                             selectedTeacherId &&
                             selectedStudentId &&
                             subjectId &&
                             finalBoothId &&
                             startTime &&
                             endTime;

    if (!hasRequiredFields) return false;
    if (startTime >= endTime) return false;

    if (isRecurring) {
      return dateRange?.from && dateRange?.to;
    } else {
      return dateRange?.from;
    }
  }, [isInitializing, selectedParentClassTypeId, selectedTeacherId, selectedStudentId, subjectId, selectedBoothId, lessonData.boothId, startTime, endTime, isRecurring, dateRange]);

  const handleSubmit = async () => {
    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    const finalClassTypeId = selectedChildClassTypeId || selectedParentClassTypeId;
    const finalBoothId = lessonData.boothId || selectedBoothId; // NEW: Use selected booth if lesson data doesn't have one

    const payload: CreateClassSessionWithConflictsPayload = {
      date: formatDateToString(lessonData.date),
      startTime: startTime,
      endTime: endTime,
      boothId: finalBoothId, // NEW: Use final booth ID
      subjectId: subjectId,
      teacherId: selectedTeacherId,
      studentId: selectedStudentId,
      notes: notes || "",
      classTypeId: finalClassTypeId
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

    setIsSubmitting(true);
    try {
      const result = await onSave(payload);

      if (result.success) {
        onOpenChange(false);
      } else if (result.conflicts) {
        setCurrentPayload(payload);
        setConflictData(result.conflicts);
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
      // The error should already be handled as a toast in the parent component
      // Just log it here for debugging
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (isFormDisabled) return;

    const correctParentTypeId = preselectedClassTypeId ?
      (classTypes.find(type => type.classTypeId === preselectedClassTypeId && !type.parentId)?.classTypeId || regularClassTypeId) :
      regularClassTypeId;
    const correctIsRecurring = correctParentTypeId === regularClassTypeId;
    const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;

    setSelectedParentClassTypeId(correctParentTypeId);
    setSelectedChildClassTypeId('');
    setSelectedTeacherId(preselectedTeacherId || '');
    setSelectedStudentId(preselectedStudentId || '');
    setSelectedBoothId(lessonData.boothId || ''); // NEW: Reset booth state
    setIsRecurring(correctIsRecurring);
    setSubjectId('');
    setNotes('');
    setStartTime(lessonData.startTime);
    setEndTime(lessonData.endTime);
    setSelectedDays([]);
    setDateRange({ from: lessonDate, to: undefined });

    setError(null);
    setValidationErrors([]);
  };

  const isLoading = isLoadingClassTypes || isSubmitting;

  const daysOfWeek = [
    { label: '月', value: 1 },
    { label: '火', value: 2 },
    { label: '水', value: 3 },
    { label: '木', value: 4 },
    { label: '金', value: 5 },
    { label: '土', value: 6 },
    { label: '日', value: 0 }
  ];

  // Form content markup (rendered directly to avoid remounting between renders)
  const renderFormContent = (disabled: boolean) => (
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">日付</label>
          <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
            {format(typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date, 'yyyy年MM月dd日', { locale: ja })}
          </div>
        </div>

        {/* UPDATED: Booth Field - Conditional selector or static display */}          <div>
            <label className="text-sm font-medium text-foreground">
              ブース <span className="text-destructive">*</span>
            </label>
          {!lessonData.boothId ? (
            // Show selector for weekly calendar (no pre-selected booth)
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1">
                <SearchableSelect
                  value={selectedBoothId}
                  onValueChange={handleBoothChange}
                  items={boothItems}
                  placeholder="ブースを選択"
                  searchPlaceholder="ブースを検索..."
                  emptyMessage="ブースが見つかりません"
                  disabled={disabled}
                />
              </div>
              {selectedBoothId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearBooth}
                  className="px-2"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            // Show static field for daily calendar (pre-selected booth)
            <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
              {booths.find(booth => booth.boothId === lessonData.boothId)?.name || lessonData.boothId}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">開始時間 <span className="text-destructive">*</span></label>
          <div className="mt-1">
            <TimeInput
              value={startTime}
              onChange={setStartTime}
              placeholder="開始時間を選択"
              disabled={disabled}
              teacherAvailability={teacherAvailability}
              studentAvailability={studentAvailability}
              timeSlots={Array.from({ length: 57 }, (_, i) => {
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
              })}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">終了時間 <span className="text-destructive">*</span></label>
          <div className="mt-1">
            <TimeInput
              value={endTime}
              onChange={setEndTime}
              placeholder="終了時間を選択"
              disabled={disabled}
              teacherAvailability={teacherAvailability}
              studentAvailability={studentAvailability}
              timeSlots={Array.from({ length: 57 }, (_, i) => {
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
              })}
            />
          </div>
        </div>
      </div>

      {/* Class type selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="parent-class-type-select" className="text-sm font-medium mb-1 block text-foreground">
            授業タイプ（基本） <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect
                value={selectedParentClassTypeId}
                onValueChange={handleParentClassTypeChange}
                items={parentClassTypeItems}
                placeholder="基本タイプを選択"
                searchPlaceholder="基本タイプを検索..."
                emptyMessage="基本タイプが見つかりません"
                disabled={isLoadingClassTypes || disabled}
              />
            </div>
            {selectedParentClassTypeId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearParentClassType}
                className="px-2"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="child-class-type-select" className="text-sm font-medium mb-1 block text-foreground">
            授業タイプ（詳細）
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchableSelect
                value={selectedChildClassTypeId}
                onValueChange={handleChildClassTypeChange}
                items={childClassTypeItems}
                placeholder={
                  !selectedParentClassTypeId
                    ? "先に基本タイプを選択"
                    : childClassTypes.length === 0
                    ? "詳細タイプなし"
                    : "詳細タイプを選択（任意）"
                }
                searchPlaceholder="詳細タイプを検索..."
                emptyMessage="詳細タイプが見つかりません"
                disabled={!selectedParentClassTypeId || childClassTypes.length === 0 || disabled}
              />
            </div>
            {selectedChildClassTypeId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearChildClassType}
                className="px-2"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Teacher and Student selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="teacher-select" className="text-sm font-medium mb-1 block text-foreground">
            講師 <span className="text-destructive">*</span>
            {hasStudentSelected && (
              <span className="text-xs text-muted-foreground ml-1">
                ({enhancedTeachers.filter((t: EnhancedTeacher) => t.compatibilityType === 'perfect').length} 完全一致)
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Combobox<CompatibilityComboboxItem>
                items={teacherItems}
                value={selectedTeacherId}
                onValueChange={handleTeacherChange}
                placeholder="講師を選択"
                searchPlaceholder="講師を検索..."
                emptyMessage="講師が見つかりません"
                disabled={disabled}
                clearable
                searchValue={teacherSearchQuery}
                onSearchChange={setTeacherSearchQuery}
                loading={isLoadingTeachers || isFetchingTeachers}
                triggerClassName="h-10"
                onOpenChange={(nextOpen) => {
                  if (!nextOpen) {
                    setTeacherSearchQuery('');
                  }
                }}
                renderItem={renderCompatibilityComboboxItem}
              />
            </div>
            {selectedTeacherId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearTeacher}
                className="px-2"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

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
              <Combobox<CompatibilityComboboxItem>
                items={studentItems}
                value={selectedStudentId}
                onValueChange={handleStudentChange}
                placeholder="生徒を選択"
                searchPlaceholder="生徒を検索..."
                emptyMessage="生徒が見つかりません"
                disabled={disabled}
                clearable
                searchValue={studentSearchQuery}
                onSearchChange={setStudentSearchQuery}
                loading={isLoadingStudents || isFetchingStudents}
                triggerClassName="h-10"
                onOpenChange={(nextOpen) => {
                  if (!nextOpen) {
                    setStudentSearchQuery('');
                  }
                }}
                renderItem={renderCompatibilityComboboxItem}
              />
            </div>
            {selectedStudentId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearStudent}
                className="px-2"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Compatibility indicator */}
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

      {/* Subject selector */}
      <div>
        <label htmlFor="subject-select" className="text-sm font-medium mb-1 block text-foreground">
          科目 <span className="text-destructive">*</span>
          {!canSelectSubject && (
            <span className="text-xs text-amber-600 dark:text-amber-500 ml-2">
              (推奨: 講師と生徒を選択すると適合度が表示されます)
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
              disabled={disabled}
            />
          </div>
          {subjectId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSubject}
              className="px-2"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Recurring lesson configuration */}
      {isRecurring && (
        <div className="space-y-3 p-3 rounded-md border border-input bg-muted/30">
          <div>
            <label className="text-sm font-medium mb-1 block text-foreground">期間 <span className="text-destructive">*</span></label>
            <div className="relative">
            <SimpleDateRangePicker
  value={dateRange}
  onValueChange={setDateRange}
  placeholder="期間を選択してください"
  disabled={disabled}
  showPresets={true}
  disablePastDates={true}
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
                  disabled={disabled}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm
                    transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
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
                ? `曜日が選択されていない場合、${format(typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date, 'EEEE', { locale: ja })}が使用されます。`
                : `選択された曜日: ${selectedDays.map(d => daysOfWeek.find(day => day.value === d)?.label).join(', ')}`
              }
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="text-sm font-medium mb-1 block text-foreground">メモ</label>
        <textarea
          id="notes"
          className="w-full min-h-[60px] p-2 border rounded-md bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors border-input disabled:opacity-50 disabled:cursor-not-allowed"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="授業に関するメモを入力してください"
          disabled={disabled}
        />
      </div>

      {/* Error displays - только для активной формы */}
      {!disabled && error && (
        <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {!disabled && validationErrors.length > 0 && (
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
  );

  if (isInitializing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
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
      <DialogContent
        className={cn(
          "max-h-[90vh]",
          conflictData ? "sm:max-w-[1400px]" : "sm:max-w-[800px]"
        )}
      >
        <DialogHeader>
          <DialogTitle>授業の作成</DialogTitle>
          <DialogDescription>
            {conflictData ? "競合が発見されました。解決方法を選択してください。" : "新しい授業の情報を入力してください"}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(conflictData ? "max-h-[70vh]" : "overflow-y-auto max-h-[70vh]")}>
          {conflictData ? (
            // Two-column layout when conflicts exist
            <div className="flex gap-6">
              {/* Left column - Form (disabled) - FIXED HEIGHT */}
              <div className="w-[600px] flex-shrink-0 max-h-[70vh] overflow-auto">
                <div className="text-sm font-medium mb-2 text-muted-foreground">
                  入力された情報:
                </div>
                <div className="px-1 opacity-60 pointer-events-none">
                  {renderFormContent(true)}
                </div>
              </div>

              {/* Right column - Conflict Resolution Table */}
              <div className="flex-1 min-w-0 border-l border-border pl-6 flex flex-col max-h-[70vh]">
                <div className="flex-1 min-h-0">
                  <ConflictResolutionTable
                    conflictData={conflictData}
                    originalTime={{ startTime, endTime }}
                    onSubmit={handleConflictResolution}
                    onCancel={handleConflictCancel}
                    isLoading={isSubmitting}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Single column layout when no conflicts - original form
            <div className="px-1">
              {renderFormContent(false)}
            </div>
          )}
        </div>

        {!conflictData && (
          <DialogFooter className="pt-2">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-destructive/30 focus:outline-none"
                onClick={handleReset}
                disabled={isLoading}
              >
                リセット
              </Button>
              <Button
                className="ml-auto transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                onClick={handleSubmit}
                disabled={!canSubmit || isLoading}
              >
                {isLoading ? "処理中..." : "作成"}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
