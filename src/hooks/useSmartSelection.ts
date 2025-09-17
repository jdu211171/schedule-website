import { useMemo } from 'react';
import { useTeachers, Teacher, useTeacher } from '@/hooks/useTeacherQuery';
import { useStudents, Student, useStudent } from '@/hooks/useStudentQuery';
import { useSubjects, Subject } from '@/hooks/useSubjectQuery';
import { useSubjectTypes, SubjectType } from '@/hooks/useSubjectTypeQuery';

interface SmartSelectionOptions {
  selectedTeacherId?: string;
  selectedStudentId?: string;
  selectedSubjectId?: string;
  activeOnly?: boolean; // when true, fetch only ACTIVE users
  studentSearchTerm?: string;
  teacherSearchTerm?: string;
}

export interface EnhancedTeacher extends Teacher {
  compatibilityType: 'perfect' | 'subject-only' | 'teacher-no-prefs' | 'mismatch' | 'no-student-selected' | 'student-no-prefs';
  hasMatchingSubjects: boolean;
  matchingSubjectsCount: number;
  partialMatchingSubjectsCount: number;
}

export interface EnhancedStudent extends Student {
  compatibilityType: 'perfect' | 'subject-only' | 'student-no-prefs' | 'mismatch' | 'no-teacher-selected' | 'teacher-no-prefs';
  hasMatchingSubjects: boolean;
  matchingSubjectsCount: number;
  partialMatchingSubjectsCount: number;
}

export interface SubjectCompatibility {
  subjectId: string;
  name: string;
  compatibilityType: 'perfect' | 'subject-only' | 'teacher-only' | 'student-only' | 'no-preferences' | 'mismatch';
  hasTeacherPreference: boolean;
  hasStudentPreference: boolean;
  hasFullMatch: boolean;
  hasPartialMatch: boolean;
}

export interface CompatibilityInfo {
  hasTeacherPrefs: boolean;
  hasStudentPrefs: boolean;
  perfectMatches: number;
  partialMatches: number;
  teacherSubjectsCount: number;
  studentSubjectsCount: number;
  compatibilityType: 'perfect' | 'subject-only' | 'teacher-only' | 'student-only' | 'no-preferences' | 'mismatch';
  message: string;
}

// Helper function to check if teacher and student preferences match
function checkSubjectMatch(teacherPref: any, studentPref: any) {
  const sameSubject = teacherPref.subjectId === studentPref.subjectId;
  if (!sameSubject) return { perfect: false, partial: false };

  // Check if subject types overlap
  const teacherTypes = teacherPref.subjectTypeIds || [];
  const studentTypes = studentPref.subjectTypeIds || [];

  const commonTypes = teacherTypes.filter((typeId: string) =>
    studentTypes.includes(typeId)
  );

  const hasCommonTypes = commonTypes.length > 0;

  return {
    perfect: sameSubject && hasCommonTypes,
    partial: sameSubject && !hasCommonTypes
  };
}

// Helper function to get all matches between teacher and student
function getMatches(teacherPrefs: any[], studentPrefs: any[]) {
  let perfectMatches = 0;
  let partialMatches = 0;
  const matchedSubjects = new Set<string>();

  teacherPrefs.forEach(teacherPref => {
    studentPrefs.forEach(studentPref => {
      const match = checkSubjectMatch(teacherPref, studentPref);
      if (match.perfect && !matchedSubjects.has(teacherPref.subjectId)) {
        perfectMatches++;
        matchedSubjects.add(teacherPref.subjectId);
      } else if (match.partial && !matchedSubjects.has(teacherPref.subjectId)) {
        partialMatches++;
        matchedSubjects.add(teacherPref.subjectId);
      }
    });
  });

  return { perfectMatches, partialMatches };
}

export const useSmartSelection = (options: SmartSelectionOptions = {}) => {
  const {
    selectedTeacherId,
    selectedStudentId,
    selectedSubjectId,
    activeOnly = false,
    studentSearchTerm,
    teacherSearchTerm,
  } = options;

  const normalizedStudentSearch = studentSearchTerm?.trim();
  const normalizedTeacherSearch = teacherSearchTerm?.trim();

  const {
    data: teachersResponse,
    isFetching: isFetchingTeachers,
    isLoading: isLoadingTeachers,
  } = useTeachers({
    limit: 100,
    status: activeOnly ? 'ACTIVE' : undefined,
    name: normalizedTeacherSearch ? normalizedTeacherSearch : undefined,
  });
  const {
    data: studentsResponse,
    isFetching: isFetchingStudents,
    isLoading: isLoadingStudents,
  } = useStudents({
    limit: 100,
    status: activeOnly ? 'ACTIVE' : undefined,
    name: normalizedStudentSearch ? normalizedStudentSearch : undefined,
  });
  const { data: selectedTeacherData } = useTeacher(selectedTeacherId ?? '');
  const { data: selectedStudentData } = useStudent(selectedStudentId ?? '');
  const { data: subjectsResponse } = useSubjects({ limit: 100 });
  const { data: subjectTypesResponse } = useSubjectTypes({ limit: 100 });

  const allTeachers = useMemo(() => {
    const map = new Map<string, Teacher>();

    (teachersResponse?.data || []).forEach((teacher) => {
      map.set(teacher.teacherId, teacher);
    });

    if (selectedTeacherData) {
      map.set(selectedTeacherData.teacherId, selectedTeacherData);
    }

    return Array.from(map.values());
  }, [teachersResponse?.data, selectedTeacherData]);
  const allStudents = useMemo(() => {
    const map = new Map<string, Student>();

    (studentsResponse?.data || []).forEach((student) => {
      map.set(student.studentId, student);
    });

    if (selectedStudentData) {
      map.set(selectedStudentData.studentId, selectedStudentData);
    }

    return Array.from(map.values());
  }, [studentsResponse?.data, selectedStudentData]);
  const allSubjects = subjectsResponse?.data || [];
  const allSubjectTypes = subjectTypesResponse?.data || [];

  // Find selected teacher and student
  const selectedTeacher = useMemo(() =>
    allTeachers.find(t => t.teacherId === selectedTeacherId),
    [allTeachers, selectedTeacherId]
  );

  const selectedStudent = useMemo(() =>
    allStudents.find(s => s.studentId === selectedStudentId),
    [allStudents, selectedStudentId]
  );

  // Get preferences from selected teacher/student objects
  const teacherPreferences = selectedTeacher?.subjectPreferences || [];
  const studentPreferences = selectedStudent?.subjectPreferences || [];

  // Enhanced students with compatibility analysis
  const enhancedStudents = useMemo((): EnhancedStudent[] => {
    if (!selectedTeacherId) {
      return allStudents.map(student => ({
        ...student,
        compatibilityType: 'no-teacher-selected' as const,
        hasMatchingSubjects: false,
        matchingSubjectsCount: 0,
        partialMatchingSubjectsCount: 0
      }));
    }

    if (!teacherPreferences?.length) {
      return allStudents.map(student => ({
        ...student,
        compatibilityType: 'teacher-no-prefs' as const,
        hasMatchingSubjects: true,
        matchingSubjectsCount: student.subjectPreferences?.length || 0,
        partialMatchingSubjectsCount: 0
      }));
    }

    return allStudents.map(student => {
      const studentPrefs = student.subjectPreferences || [];

      if (!studentPrefs.length) {
        return {
          ...student,
          compatibilityType: 'student-no-prefs' as const,
          hasMatchingSubjects: true,
          matchingSubjectsCount: teacherPreferences.length,
          partialMatchingSubjectsCount: 0
        };
      }

      const matches = getMatches(teacherPreferences, studentPrefs);
      const totalMatches = matches.perfectMatches + matches.partialMatches;

      let compatibilityType: EnhancedStudent['compatibilityType'];
      if (matches.perfectMatches > 0) {
        compatibilityType = 'perfect';
      } else if (matches.partialMatches > 0) {
        compatibilityType = 'subject-only';
      } else {
        compatibilityType = 'mismatch';
      }

      return {
        ...student,
        compatibilityType,
        hasMatchingSubjects: totalMatches > 0,
        matchingSubjectsCount: matches.perfectMatches,
        partialMatchingSubjectsCount: matches.partialMatches
      };
    });
  }, [selectedTeacherId, teacherPreferences, allStudents]);

  // Enhanced teachers with compatibility analysis
  const enhancedTeachers = useMemo((): EnhancedTeacher[] => {
    if (!selectedStudentId) {
      return allTeachers.map(teacher => ({
        ...teacher,
        compatibilityType: 'no-student-selected' as const,
        hasMatchingSubjects: false,
        matchingSubjectsCount: 0,
        partialMatchingSubjectsCount: 0
      }));
    }

    if (!studentPreferences?.length) {
      return allTeachers.map(teacher => ({
        ...teacher,
        compatibilityType: 'student-no-prefs' as const,
        hasMatchingSubjects: true,
        matchingSubjectsCount: teacher.subjectPreferences?.length || 0,
        partialMatchingSubjectsCount: 0
      }));
    }

    return allTeachers.map(teacher => {
      const teacherPrefs = teacher.subjectPreferences || [];

      if (!teacherPrefs.length) {
        return {
          ...teacher,
          compatibilityType: 'teacher-no-prefs' as const,
          hasMatchingSubjects: true,
          matchingSubjectsCount: studentPreferences.length,
          partialMatchingSubjectsCount: 0
        };
      }

      const matches = getMatches(teacherPrefs, studentPreferences);
      const totalMatches = matches.perfectMatches + matches.partialMatches;

      let compatibilityType: EnhancedTeacher['compatibilityType'];
      if (matches.perfectMatches > 0) {
        compatibilityType = 'perfect';
      } else if (matches.partialMatches > 0) {
        compatibilityType = 'subject-only';
      } else {
        compatibilityType = 'mismatch';
      }

      return {
        ...teacher,
        compatibilityType,
        hasMatchingSubjects: totalMatches > 0,
        matchingSubjectsCount: matches.perfectMatches,
        partialMatchingSubjectsCount: matches.partialMatches
      };
    });
  }, [selectedStudentId, studentPreferences, allTeachers]);

  // Enhanced subjects with compatibility information
  const enhancedSubjects = useMemo((): SubjectCompatibility[] => {
    return allSubjects.map(subject => {
      // Check if teacher has this subject
      const teacherHasSubject = teacherPreferences?.some(pref => pref.subjectId === subject.subjectId) || false;
      const teacherSubjectPref = teacherPreferences?.find(pref => pref.subjectId === subject.subjectId);

      // Check if student has this subject
      const studentHasSubject = studentPreferences?.some(pref => pref.subjectId === subject.subjectId) || false;
      const studentSubjectPref = studentPreferences?.find(pref => pref.subjectId === subject.subjectId);

      let hasFullMatch = false;
      let hasPartialMatch = false;

      // Check for matches if both have the subject
      if (teacherHasSubject && studentHasSubject && teacherSubjectPref && studentSubjectPref) {
        const match = checkSubjectMatch(teacherSubjectPref, studentSubjectPref);
        hasFullMatch = match.perfect;
        hasPartialMatch = match.partial;
      }

      // Determine compatibility type
      let compatibilityType: SubjectCompatibility['compatibilityType'];

      if (!selectedTeacherId && !selectedStudentId) {
        compatibilityType = 'no-preferences';
      } else if (hasFullMatch) {
        compatibilityType = 'perfect';
      } else if (hasPartialMatch) {
        compatibilityType = 'subject-only';
      } else if (teacherHasSubject && !selectedStudentId) {
        compatibilityType = 'teacher-only';
      } else if (studentHasSubject && !selectedTeacherId) {
        compatibilityType = 'student-only';
      } else if (teacherHasSubject && !studentHasSubject) {
        compatibilityType = 'teacher-only';
      } else if (studentHasSubject && !teacherHasSubject) {
        compatibilityType = 'student-only';
      } else if (!teacherPreferences?.length || !studentPreferences?.length) {
        compatibilityType = 'no-preferences';
      } else {
        compatibilityType = 'mismatch';
      }

      return {
        subjectId: subject.subjectId,
        name: subject.name,
        compatibilityType,
        hasTeacherPreference: teacherHasSubject,
        hasStudentPreference: studentHasSubject,
        hasFullMatch,
        hasPartialMatch
      };
    });
  }, [teacherPreferences, studentPreferences, allSubjects, selectedTeacherId, selectedStudentId]);

  // Filter subject types based on selected student and subject
  const filteredSubjectTypes = useMemo(() => {
    if (!selectedSubjectId || !studentPreferences?.length) {
      return allSubjectTypes;
    }

    const studentPref = studentPreferences.find(
      pref => pref.subjectId === selectedSubjectId
    );

    if (!studentPref?.subjectTypeIds?.length) {
      return [];
    }

    // Return subject types that match student's preferences for this subject
    return allSubjectTypes.filter(type =>
      studentPref.subjectTypeIds.includes(type.subjectTypeId)
    );
  }, [selectedSubjectId, studentPreferences, allSubjectTypes]);

  // Enhanced compatibility info
  const getCompatibilityInfo = (): CompatibilityInfo | null => {
    if (!selectedTeacherId || !selectedStudentId) {
      return null;
    }

    const hasTeacherPrefs = teacherPreferences && teacherPreferences.length > 0;
    const hasStudentPrefs = studentPreferences && studentPreferences.length > 0;
    const teacherSubjectsCount = teacherPreferences?.length || 0;
    const studentSubjectsCount = studentPreferences?.length || 0;

    if (!hasTeacherPrefs && !hasStudentPrefs) {
      return {
        hasTeacherPrefs: false,
        hasStudentPrefs: false,
        perfectMatches: allSubjects.length,
        partialMatches: 0,
        teacherSubjectsCount: 0,
        studentSubjectsCount: 0,
        compatibilityType: 'no-preferences',
        message: "両方とも科目設定がありません - 全科目利用可能"
      };
    }

    if (!hasTeacherPrefs) {
      return {
        hasTeacherPrefs: false,
        hasStudentPrefs: true,
        perfectMatches: studentSubjectsCount,
        partialMatches: 0,
        teacherSubjectsCount: 0,
        studentSubjectsCount,
        compatibilityType: 'student-only',
        message: "講師の科目設定がありません - 生徒の科目を優先表示"
      };
    }

    if (!hasStudentPrefs) {
      return {
        hasTeacherPrefs: true,
        hasStudentPrefs: false,
        perfectMatches: teacherSubjectsCount,
        partialMatches: 0,
        teacherSubjectsCount,
        studentSubjectsCount: 0,
        compatibilityType: 'teacher-only',
        message: "生徒の科目設定がありません - 講師の科目を優先表示"
      };
    }

    // Both have preferences - calculate matches
    const matches = getMatches(teacherPreferences!, studentPreferences!);

    if (matches.perfectMatches > 0) {
      const message = matches.partialMatches > 0
        ? `完全一致: ${matches.perfectMatches}件, 部分一致: ${matches.partialMatches}件`
        : `完全一致: ${matches.perfectMatches}件`;

      return {
        hasTeacherPrefs: true,
        hasStudentPrefs: true,
        perfectMatches: matches.perfectMatches,
        partialMatches: matches.partialMatches,
        teacherSubjectsCount,
        studentSubjectsCount,
        compatibilityType: 'perfect',
        message
      };
    } else if (matches.partialMatches > 0) {
      return {
        hasTeacherPrefs: true,
        hasStudentPrefs: true,
        perfectMatches: 0,
        partialMatches: matches.partialMatches,
        teacherSubjectsCount,
        studentSubjectsCount,
        compatibilityType: 'subject-only',
        message: `部分一致のみ: ${matches.partialMatches}件 (科目は同じだが異なるレベル)`
      };
    } else {
      return {
        hasTeacherPrefs: true,
        hasStudentPrefs: true,
        perfectMatches: 0,
        partialMatches: 0,
        teacherSubjectsCount,
        studentSubjectsCount,
        compatibilityType: 'mismatch',
        message: "共通科目がありません - 全科目から選択可能"
      };
    }
  };

  return {
    // Enhanced lists with compatibility info
    enhancedTeachers,
    enhancedStudents,
    enhancedSubjects,
    filteredSubjectTypes,

    // Original lists (for backward compatibility)
    allTeachers,
    allStudents,
    allSubjects,
    allSubjectTypes,

    // Filtered lists (now just return all for backward compatibility)
    filteredTeachers: allTeachers,
    filteredStudents: allStudents,
    filteredSubjects: allSubjects,

    // Preferences data (extracted from selected users)
    teacherPreferences,
    studentPreferences,

    // Utility functions
    getCompatibilityInfo,

    // Status flags
    hasTeacherSelected: !!selectedTeacherId,
    hasStudentSelected: !!selectedStudentId,
    hasSubjectSelected: !!selectedSubjectId,

    // Loading states
    isLoadingPreferences: false, // No separate requests needed
    isLoadingStudents,
    isFetchingStudents,
    isLoadingTeachers,
    isFetchingTeachers,
  };
};
