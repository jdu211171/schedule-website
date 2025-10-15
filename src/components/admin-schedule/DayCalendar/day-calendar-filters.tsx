import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { useSubjects } from '@/hooks/useSubjectQuery';
import { useSmartSelection, EnhancedTeacher, EnhancedStudent } from '@/hooks/useSmartSelection';
import { Combobox } from '@/components/ui/combobox';
import { CompatibilityComboboxItem, getCompatibilityPriority, renderCompatibilityComboboxItem } from '../compatibility-combobox-utils';
import { useDebounce } from '@/hooks/use-debounce';
import { DayFilters } from '@/hooks/useClassSessionQuery';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { fetchClassTypeOptions } from '@/lib/class-type-options';
import { subscribeClassTypesChanged } from '@/lib/class-types-broadcast';
import { getClassTypeSelection, setClassTypeSelection } from '@/lib/class-type-filter-persistence';
import { Faceted, FacetedBadgeList, FacetedContent, FacetedEmpty, FacetedGroup, FacetedInput, FacetedItem, FacetedList, FacetedTrigger } from '@/components/ui/faceted';
import type { ClassTypeOption } from '@/types/class-type';

interface DayCalendarFiltersProps {
  filters: DayFilters;
  onFiltersChange: (filters: DayFilters) => void;
  dateKey: string;
}

export const DayCalendarFilters: React.FC<DayCalendarFiltersProps> = ({
  filters,
  onFiltersChange,
  dateKey
}) => {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({
    limit: 100
  });

  const subjects = subjectsResponse?.data || [];

  const subjectItems: SearchableSelectItem[] = subjects.map((subject) => ({
    value: subject.subjectId,
    label: subject.name,
  }));

  // Class Type options (server-provided)
  const [classTypeOptions, setClassTypeOptions] = useState<ClassTypeOption[]>([]);
  const [classTypeLoading, setClassTypeLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setClassTypeLoading(true);
      try {
        const opts = await fetchClassTypeOptions();
        if (mounted) setClassTypeOptions(opts);
      } finally {
        if (mounted) setClassTypeLoading(false);
      }
    };
    load();
    // Subscribe for live updates
    const unsubscribe = subscribeClassTypesChanged(() => {
      load();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Cross-tab subscription for immediate updates and dialog open requests
  // Per-user visibility removed; global filter visibility now handled server-side.

  // Smart matching + searchable combobox for teacher/student (same as admin-calendar-day)
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const debouncedTeacher = useDebounce(teacherSearch, 300);
  const debouncedStudent = useDebounce(studentSearch, 300);

  const {
    enhancedTeachers,
    enhancedStudents,
    isFetchingTeachers,
    isFetchingStudents,
    isLoadingTeachers: isLoadingTeachersSmart,
    isLoadingStudents: isLoadingStudentsSmart,
  } = useSmartSelection({
    selectedTeacherId: filters.teacherId,
    selectedStudentId: filters.studentId,
    activeOnly: true,
    teacherSearchTerm: debouncedTeacher,
    studentSearchTerm: debouncedStudent,
  });

  const teacherComboItems: CompatibilityComboboxItem[] = useMemo(() => {
    return enhancedTeachers
      .map((teacher: EnhancedTeacher) => {
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
  }, [enhancedTeachers]);

  const studentComboItems: CompatibilityComboboxItem[] = useMemo(() => {
    return enhancedStudents
      .map((student: EnhancedStudent) => {
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
  }, [enhancedStudents]);

  const handleSubjectChange = (subjectId: string) => {
    onFiltersChange({
      ...filters,
      subjectId: subjectId || undefined,
    });
  };

  const handleTeacherChange = (teacherId: string) => {
    onFiltersChange({
      ...filters,
      teacherId: teacherId || undefined,
    });
  };

  const handleStudentChange = (studentId: string) => {
    onFiltersChange({
      ...filters,
      studentId: studentId || undefined,
    });
  };

  const clearSubjectFilter = () => {
    onFiltersChange({
      ...filters,
      subjectId: undefined,
    });
  };

  const clearTeacherFilter = () => {
    onFiltersChange({
      ...filters,
      teacherId: undefined,
    });
  };

  const clearStudentFilter = () => {
    onFiltersChange({
      ...filters,
      studentId: undefined,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    // Also clear persisted class type selection
    setClassTypeSelection(role, []);
  };

  // Initialize class type selection from persistence on first render if empty
  useEffect(() => {
    if (!filters.classTypeIds || filters.classTypeIds.length === 0) {
      const saved = getClassTypeSelection(role);
      if (saved && saved.length > 0) {
        onFiltersChange({ ...filters, classTypeIds: saved });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleClassTypesChange = (ids: string[] | undefined) => {
    const next = Array.isArray(ids) ? ids : [];
    onFiltersChange({ ...filters, classTypeIds: next.length ? next : undefined });
    setClassTypeSelection(role, next);
  };

  const hasActiveFilters = Boolean(
    filters.subjectId ||
    filters.teacherId ||
    filters.studentId ||
    (filters.classTypeIds && filters.classTypeIds.length > 0)
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Class Type multi-select (searchable, multi) */}
        <div className="flex items-center gap-1">
          <Faceted multiple value={filters.classTypeIds} onValueChange={handleClassTypesChange}>
            <FacetedTrigger
              aria-label="授業タイプフィルター"
              className="h-8 w-[100px] max-w-[240px] border border-input rounded-md px-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground text-sm flex items-center justify-between whitespace-nowrap overflow-hidden"
            >
              <span className="truncate">
                {`授業タイプ${filters.classTypeIds?.length ? `（${filters.classTypeIds.length}）` : ""}`}
              </span>
            </FacetedTrigger>
            <FacetedContent className="w-[240px]">
              <FacetedInput placeholder="授業タイプを検索..." />
              <FacetedList>
                <FacetedEmpty>候補がありません</FacetedEmpty>
                <FacetedGroup heading="授業タイプ">
                  {classTypeOptions.map((opt) => (
                    <FacetedItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </FacetedItem>
                  ))}
                </FacetedGroup>
              </FacetedList>
            </FacetedContent>
          </Faceted>
          {filters.classTypeIds && filters.classTypeIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClassTypesChange([])}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              disabled={classTypeLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* 表示管理 removed: visibility is now admin-controlled and global */}
        <div className="flex items-center gap-1">
          <SearchableSelect
            value={filters.subjectId || ''}
            onValueChange={handleSubjectChange}
            items={subjectItems}
            placeholder="科目を選択"
            searchPlaceholder="科目を検索..."
            emptyMessage="科目が見つかりません"
            loading={isLoadingSubjects}
            disabled={isLoadingSubjects}
            className="w-[160px]"
          />

          {filters.subjectId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSubjectFilter}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-end gap-1">
          <div className="flex-1 min-w-[200px]">
            <Combobox<CompatibilityComboboxItem>
              items={teacherComboItems}
              value={filters.teacherId || ''}
              onValueChange={handleTeacherChange}
              placeholder="講師を選択"
              searchPlaceholder="講師を検索..."
              emptyMessage="講師が見つかりません"
              disabled={false}
              clearable
              searchValue={teacherSearch}
              onSearchChange={setTeacherSearch}
              loading={isLoadingTeachersSmart || isFetchingTeachers}
              triggerClassName="h-8"
              onOpenChange={(open) => { if (!open) setTeacherSearch(''); }}
              renderItem={renderCompatibilityComboboxItem}
            />
          </div>
          {filters.teacherId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTeacherFilter}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-end gap-1">
          <div className="flex-1 min-w-[200px]">
            <Combobox<CompatibilityComboboxItem>
              items={studentComboItems}
              value={filters.studentId || ''}
              onValueChange={handleStudentChange}
              placeholder="生徒を選択"
              searchPlaceholder="生徒を検索..."
              emptyMessage="生徒が見つかりません"
              disabled={false}
              clearable
              searchValue={studentSearch}
              onSearchChange={setStudentSearch}
              loading={isLoadingStudentsSmart || isFetchingStudents}
              triggerClassName="h-8"
              onOpenChange={(open) => { if (!open) setStudentSearch(''); }}
              renderItem={renderCompatibilityComboboxItem}
            />
          </div>
          {filters.studentId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearStudentFilter}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          aria-label="すべてクリア"
          title="すべてクリア"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {/* ManageClassTypeVisibilityDialog removed */}
    </div>
  );
};
