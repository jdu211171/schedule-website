import React from 'react';
import { Button } from '@/components/ui/button';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { useSubjects } from '@/hooks/useSubjectQuery';
import { useTeachers } from '@/hooks/useTeacherQuery';
import { useStudents } from '@/hooks/useStudentQuery';
import { DayFilters } from '@/hooks/useClassSessionQuery';
import { X } from 'lucide-react';

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
  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({
    limit: 100
  });

  const { data: teachersResponse, isLoading: isLoadingTeachers } = useTeachers({
    limit: 100
  });

  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({
    limit: 100
  });

  const subjects = subjectsResponse?.data || [];
  const teachers = teachersResponse?.data || [];
  const students = studentsResponse?.data || [];

  const subjectItems: SearchableSelectItem[] = subjects.map((subject) => ({
    value: subject.subjectId,
    label: subject.name,
  }));

  const teacherItems: SearchableSelectItem[] = teachers.map((teacher) => ({
    value: teacher.teacherId,
    label: teacher.name,
  }));

  const studentItems: SearchableSelectItem[] = students.map((student) => ({
    value: student.studentId,
    label: student.name,
  }));

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
  };

  const hasActiveFilters = Boolean(filters.subjectId || filters.teacherId || filters.studentId);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-1">
          <SearchableSelect
            value={filters.teacherId || ''}
            onValueChange={handleTeacherChange}
            items={teacherItems}
            placeholder="講師を選択"
            searchPlaceholder="講師を検索..."
            emptyMessage="講師が見つかりません"
            loading={isLoadingTeachers}
            disabled={isLoadingTeachers}
            className="w-[180px]"
          />

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

        <div className="flex items-center gap-1">
          <SearchableSelect
            value={filters.studentId || ''}
            onValueChange={handleStudentChange}
            items={studentItems}
            placeholder="生徒を選択"
            searchPlaceholder="生徒を検索..."
            emptyMessage="生徒が見つかりません"
            loading={isLoadingStudents}
            disabled={isLoadingStudents}
            className="w-[180px]"
          />

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
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="h-8 text-xs whitespace-nowrap"
        >
          すべてクリア
        </Button>
      )}
    </div>
  );
};
