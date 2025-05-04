"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TeacherTable from "../../../components/match/teacher-table";
import StudentTable from "../../../components/match/student-table";
import LessonScheduleModal from "../../../components/match/lesson-schedule-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Import hooks
import { useMatchTeachers } from "@/components/match/hooks/useMatchTeachers";
import { useMatchStudents } from "@/components/match/hooks/useMatchStudents";
import { useMatchSubjects } from "@/components/match/hooks/useMatchSubjects";
import { useMatchGrades } from "@/components/match/hooks/useMatchGrades";
import { useMatchEvaluations } from "@/components/match/hooks/useMatchEvaluations";
import { useMatchTeacherSubjects } from "@/components/match/hooks/useMatchTeacherSubjects";
import { useMatchClassSessions } from "@/components/match/hooks/useMatchClassSessions";
import { useMatchStudentTypes } from "@/components/match/hooks/useMatchStudentTypes";
import { useCompatibleTeachers } from "@/components/match/hooks/useCompatibleTeachers";
import { useCompatibleStudents } from "@/components/match/hooks/useCompatibleStudents";

// Import types
import {
  StudentWithPreference,
  Grade,
  Subject,
  Teacher,
  Student,
  TeacherSubject,
  Evaluation,
  StudentType,
  ClassSession,
  TeacherFilterParams,
  StudentFilterParams
} from "@/components/match/types";

export default function LessonManagementPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstSelection, setFirstSelection] = useState<"teacher" | "student" | null>(null);

  const [cachedFilteredTeachers, setCachedFilteredTeachers] = useState<Teacher[]>([]);
  const [cachedFilteredStudents, setCachedFilteredStudents] = useState<StudentWithPreference[]>([]);
  const [studentKibouSubjects, setStudentKibouSubjects] = useState<Subject[]>([]);
  const [teacherKibouSubjects, setTeacherKibouSubjects] = useState<Subject[]>([]);
  
  const [isLoadingTeacherCompatibility, setIsLoadingTeacherCompatibility] = useState(false);
  const [isLoadingStudentCompatibility, setIsLoadingStudentCompatibility] = useState(false);

  // Состояния фильтров для учителей
  const [teacherSubjectFilters, setTeacherSubjectFilters] = useState<string[]>([]);
  const [teacherEvaluationFilters, setTeacherEvaluationFilters] = useState<string[]>([]);

  // Состояния фильтров для студентов
  const [studentSubjectFilters, setStudentSubjectFilters] = useState<string[]>([]);
  const [studentGradeFilter, setStudentGradeFilter] = useState<string | null>(null);
  const [studentTypeFilters, setStudentTypeFilters] = useState<string[]>([]);
  const [studentSchoolTypeFilter, setStudentSchoolTypeFilter] = useState<string | null>(null);

  /* -------------------- Обработчик серверной фильтрации учителей -------------------- */
  const handleTeacherFiltersChange = useCallback(
    (params: TeacherFilterParams) => {
      if ('subjectId' in params) {
        if (params.subjectId) {
          setTeacherSubjectFilters([...params.subjectId]);
        } else {
          setTeacherSubjectFilters([]);
        }
      }
      
      if ('evaluationId' in params) {
        if (params.evaluationId) {
          setTeacherEvaluationFilters([...params.evaluationId]);
        } else {
          setTeacherEvaluationFilters([]);
        }
      }
      
      if (Object.keys(params).length === 0) {
        setTeacherSubjectFilters([]);
        setTeacherEvaluationFilters([]);
      }
    },
    []
  );

/* -------------------- Обработчик серверной фильтрации студентов -------------------- */
const handleStudentFiltersChange = useCallback(
  (params: StudentFilterParams) => {
    if ('preferredSubjectId' in params) {
      if (params.preferredSubjectId) {
        setStudentSubjectFilters([...params.preferredSubjectId]);
      } else {
        setStudentSubjectFilters([]);
      }
    }
    
    if ('gradeId' in params) {
      // Добавляем проверку на undefined
      if (params.gradeId !== undefined) {
        setStudentGradeFilter(params.gradeId);
      }
    }

    if ('studentTypeId' in params) {
      if (params.studentTypeId) {
        setStudentTypeFilters([...params.studentTypeId]);
      } else {
        setStudentTypeFilters([]);
      }
    }
    
    if ('schoolType' in params) {
      if (params.schoolType !== undefined) {
        setStudentSchoolTypeFilter(params.schoolType);
      }
    }
    
    if (Object.keys(params).length === 0) {
      setStudentSubjectFilters([]);
      setStudentGradeFilter(null);
      setStudentTypeFilters([]);
      setStudentSchoolTypeFilter(null);
    }
  },
  []
);

  // Запрос учителей с фильтрами
  const { data: teachersData, isLoading: teachersLoading } = useMatchTeachers({
    page: 1,
    limit: 100,
    subjectId: teacherSubjectFilters.length > 0 ? teacherSubjectFilters : undefined,
    evaluationId: teacherEvaluationFilters.length > 0 ? teacherEvaluationFilters : undefined,
  });
  const teachers = useMemo(() => teachersData?.data || [], [teachersData]);

  // Запрос студентов с фильтрами
  const { data: studentsData, isLoading: studentsLoading } = useMatchStudents({
    page: 1,
    limit: 100,
    preferredSubjectId: studentSubjectFilters.length > 0 ? studentSubjectFilters : undefined,
    gradeId: studentGradeFilter || undefined,
    studentTypeId: studentTypeFilters.length > 0 ? studentTypeFilters : undefined,
    examSchoolType: studentSchoolTypeFilter || undefined,
  });
  const studentsFromApi = useMemo(() => studentsData?.data || [], [studentsData]);

  const { data: subjectsData, isLoading: subjectsLoading } = useMatchSubjects({
    page: 1,
    limit: 100,
  });
  const subjects = useMemo(() => subjectsData?.data || [], [subjectsData]);

  const { data: gradesData, isLoading: gradesLoading } = useMatchGrades({
    page: 1,
    limit: 100,
  });
  const grades = gradesData?.data || [];

  const { data: evaluationsData, isLoading: evaluationsLoading } = useMatchEvaluations({
    page: 1,
    limit: 100,
  });
  const evaluations = evaluationsData?.data || [];

  const { data: teacherSubjectsData, isLoading: teacherSubjectsLoading } = useMatchTeacherSubjects({
    page: 1,
    limit: 100,
  });
  const teacherSubjects = useMemo(() => teacherSubjectsData?.data || [], [teacherSubjectsData]);
  const { data: classSessionsData, isLoading: classSessionsLoading } = useMatchClassSessions({});
  const classSessions = useMemo(() => classSessionsData?.data || [], [classSessionsData]);

  const { data: studentTypesData, isLoading: studentTypesLoading } = useMatchStudentTypes({
    page: 1,
    limit: 100,
  });
  const studentTypes = studentTypesData?.data || [];

  // Обогащение данных о студентах информацией о предпочтениях
  const students = useMemo(() => studentsFromApi.map((student: Student) => ({
    ...student,
    preference: student.studentRegularPreferences?.[0]
      ? {
          preferredSubjects: student.studentRegularPreferences[0].preferredSubjects,
          preferredTeachers: student.studentRegularPreferences[0].preferredTeachers,
          desiredTimes: Array.isArray(student.studentRegularPreferences[0].preferredWeekdaysTimes)
            ? student.studentRegularPreferences[0].preferredWeekdaysTimes
            : [],
          additionalNotes: student.studentRegularPreferences[0].notes ?? null,
        }
      : null,
  })), [studentsFromApi]);

  // Получение предметов студента с добавленными типами
 const getStudentSubjects = useCallback((studentId: string | null): Subject[] => {
  if (!studentId) return [];
  
  const student = students.find((s: StudentWithPreference) => s.studentId === studentId);
  if (!student) return [];
  
  const subjectIds = new Set<string>();
  const studentSubjectsList: Subject[] = [];
  
  if (student.preference && student.preference.preferredSubjects) {
    student.preference.preferredSubjects.forEach((subjectId: string) => {
      if (!subjectIds.has(subjectId)) {
        const subject = subjects.find((s: Subject) => s.subjectId === subjectId);
        if (subject) {
          subjectIds.add(subjectId);
          studentSubjectsList.push(subject);
        }
      }
    });
  }
  
  if (student.StudentPreference) {
    student.StudentPreference.forEach((pref: any) => {
      if (pref.subjects) {
        pref.subjects.forEach((subjectItem: any) => {
          if (subjectItem.subjectId && !subjectIds.has(subjectItem.subjectId)) {
            const subject = subjects.find((s: Subject) => s.subjectId === subjectItem.subjectId);
            if (subject) {
              subjectIds.add(subjectItem.subjectId);
              studentSubjectsList.push(subject);
            } else if (subjectItem.subject) {
              subjectIds.add(subjectItem.subject.subjectId);
              studentSubjectsList.push(subjectItem.subject);
            }
          }
        });
      }
    });
  }
  
  const studentLessons = classSessions.filter(lesson => lesson.studentId === studentId);
  
  studentLessons.forEach(lesson => {
    if (lesson.subject && !subjectIds.has(lesson.subject.subjectId)) {
      subjectIds.add(lesson.subject.subjectId);
      studentSubjectsList.push(lesson.subject);
    } else if (lesson.subjectId && !subjectIds.has(lesson.subjectId)) {
      const subject = subjects.find((s: Subject) => s.subjectId === lesson.subjectId);
      if (subject && !subjectIds.has(subject.subjectId)) {
        subjectIds.add(subject.subjectId);
        studentSubjectsList.push(subject);
      }
    }
  });
  
  return studentSubjectsList;
}, [students, subjects, classSessions]);

  // Получение предметов учителя
  const getTeacherSubjects = useCallback((teacherId: string | null): Subject[] => {
    if (!teacherId) return [];
    
    const teacherSubjectsData = teacherSubjects.filter(
      (ts: TeacherSubject) => ts.teacherId === teacherId
    );
    const subjectIds = teacherSubjectsData.map((ts: TeacherSubject) => ts.subjectId);
    
    return subjects.filter(subject => subjectIds.includes(subject.subjectId));
  }, [teacherSubjects, subjects]);

  // Получение совместимых учителей и студентов
  const { 
    data: compatibleTeachersData, 
    isLoading: compatibleTeachersLoading 
  } = useCompatibleTeachers(selectedStudentId);
  
  const { 
    data: compatibleStudentsData, 
    isLoading: compatibleStudentsLoading 
  } = useCompatibleStudents(selectedTeacherId);

  // Обновление предметов студента при выборе студента
  useEffect(() => {
    if (selectedStudentId) {
      const studentSubjects = getStudentSubjects(selectedStudentId);
      if (studentSubjects.length > 0) {
        setStudentKibouSubjects(studentSubjects);
      }
    }
  }, [selectedStudentId, getStudentSubjects]);

  // Обновление предметов учителя при выборе учителя
  useEffect(() => {
    if (selectedTeacherId) {
      const teacherSubjects = getTeacherSubjects(selectedTeacherId);
      if (teacherSubjects.length > 0) {
        setTeacherKibouSubjects(teacherSubjects);
      }
    }
  }, [selectedTeacherId, getTeacherSubjects]);

  // Обработка данных о совместимых студентах
  useEffect(() => {
    setIsLoadingStudentCompatibility(compatibleStudentsLoading);
    
    if (compatibleStudentsData && !compatibleStudentsLoading) {
      setCachedFilteredStudents(compatibleStudentsData.filteredStudents || []);
      
      if (compatibleStudentsData.kibouSubjects && compatibleStudentsData.kibouSubjects.length > 0) {
        setTeacherKibouSubjects(compatibleStudentsData.kibouSubjects);
      } else {
        const subjects = getTeacherSubjects(selectedTeacherId);
        if (subjects.length > 0) {
          setTeacherKibouSubjects(subjects);
        }
      }
    } else if (!selectedTeacherId) {
      setCachedFilteredStudents([]);
      setTeacherKibouSubjects([]);
    }
  }, [compatibleStudentsData, compatibleStudentsLoading, selectedTeacherId, getTeacherSubjects]);

  // Обработка данных о совместимых учителях
  useEffect(() => {
    setIsLoadingTeacherCompatibility(compatibleTeachersLoading);
    
    if (compatibleTeachersData && !compatibleTeachersLoading) {
      setCachedFilteredTeachers(compatibleTeachersData.filteredTeachers || []);
      
      if (compatibleTeachersData.kibouSubjects && compatibleTeachersData.kibouSubjects.length > 0) {
        setStudentKibouSubjects(compatibleTeachersData.kibouSubjects);
      } else {
        const subjects = getStudentSubjects(selectedStudentId);
        if (subjects.length > 0) {
          setStudentKibouSubjects(subjects);
        }
      }
    } else if (!selectedStudentId) {
      setCachedFilteredTeachers([]);
      setStudentKibouSubjects([]);
    }
  }, [compatibleTeachersData, compatibleTeachersLoading, selectedStudentId, getStudentSubjects]);

  // Обработчик выбора учителя
  const handleTeacherSelect = useCallback((teacherId: string) => {
    if (teacherId === selectedTeacherId) {
      const wasFirstSelection = firstSelection === "teacher";
      setSelectedTeacherId(null);
      if (wasFirstSelection && selectedStudentId) {
        setFirstSelection("student");
      } else if (!selectedStudentId) {
        setFirstSelection(null);
      }
    } else {
      if (!selectedTeacherId && !selectedStudentId) {
        setFirstSelection("teacher");
      }
      setSelectedTeacherId(teacherId);
    }
  }, [selectedTeacherId, selectedStudentId, firstSelection]);

  // Обработчик выбора студента
  const handleStudentSelect = useCallback((studentId: string) => {
    if (studentId === selectedStudentId) {
      const wasFirstSelection = firstSelection === "student";
      setSelectedStudentId(null);
      if (wasFirstSelection && selectedTeacherId) {
        setFirstSelection("teacher");
      } else if (!selectedTeacherId) {
        setFirstSelection(null);
      }
    } else {
      if (!selectedTeacherId && !selectedStudentId) {
        setFirstSelection("student");
      }
      setSelectedStudentId(studentId);
    }
  }, [selectedStudentId, selectedTeacherId, firstSelection]);

  const shouldFilterTeachers = selectedStudentId !== null;
  const shouldFilterStudents = selectedTeacherId !== null;
  const isButtonActive = selectedTeacherId !== null && selectedStudentId !== null;

  const getFilteredClassSessions = useCallback(() => {
    return classSessions.filter(
      (session) =>
        session.teacherId === selectedTeacherId ||
        session.studentId === selectedStudentId,
    ) as ClassSession[];
  }, [classSessions, selectedTeacherId, selectedStudentId]);

  const openModal = useCallback(() => {
    if (isButtonActive) {
      setIsModalOpen(true);
    }
  }, [isButtonActive]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleAddClassSession = useCallback((session: Partial<ClassSession>) => {
    // Логика добавления сессии
  }, []);

  // Удален useEffect для логирования kibou предметов

  const isLoading =
    teachersLoading ||
    studentsLoading ||
    classSessionsLoading ||
    subjectsLoading ||
    gradesLoading ||
    evaluationsLoading ||
    teacherSubjectsLoading ||
    studentTypesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">授業管理</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-4">先生</h2>
            <Skeleton className="w-full h-[500px]" />
          </div>
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-4">生徒</h2>
            <Skeleton className="w-full h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">授業管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[400px]">
        <div className="col-span-2 flex justify-between items-center mb-2">
          <div className="flex items-center min-w-[200px]">
            <h2 className="text-xl font-semibold">先生:</h2>
            {selectedTeacherId && teachers ? (
              <span className="ml-2 text-green-700 font-medium">
                {teachers.find((t: Teacher) => t.teacherId === selectedTeacherId)?.name}
              </span>
            ) : (
              <span className="ml-2 text-gray-400 italic">未選択</span>
            )}
          </div>

          <div className="flex justify-center flex-1">
            <Button
              onClick={openModal}
              disabled={!isButtonActive}
              variant="outline"
              className={`px-3 py-1 rounded-xl text-sm shadow transition-colors ${
                isButtonActive
                  ? "bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700 hover:text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              クラスセッションを編集
            </Button>
          </div>

          <div className="flex items-center min-w-[200px] justify-end">
            <h2 className="text-xl font-semibold">生徒:</h2>
            {selectedStudentId && students ? (
              <span className="ml-2 text-blue-700 font-medium truncate">
                {students.find((s: StudentWithPreference) => s.studentId === selectedStudentId)?.name}
              </span>
            ) : (
              <span className="ml-2 text-gray-400 italic">未選択</span>
            )}
          </div>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex-grow">
            {isLoadingTeacherCompatibility && shouldFilterTeachers && (
              <div className="py-2 px-4 mb-2 bg-blue-50 text-blue-700 rounded shadow-sm">
                互換性のある先生を検索中...
              </div>
            )}
            <TeacherTable
              teachers={teachers as Teacher[]}
              selectedTeacherId={selectedTeacherId}
              onTeacherSelect={handleTeacherSelect}
              lessons={classSessions as unknown as ClassSession[]}
              subjects={subjects as Subject[]}
              evaluations={evaluations as Evaluation[]}
              teacherSubjects={teacherSubjects as TeacherSubject[]}
              selectedStudentId={selectedStudentId}
              filteredTeachers={shouldFilterTeachers ? cachedFilteredTeachers : undefined}
              kibouSubjects={studentKibouSubjects}
              onTeacherFiltersChange={handleTeacherFiltersChange}
              currentSubjectFilters={teacherSubjectFilters}
              currentEvaluationFilters={teacherEvaluationFilters}
            />
          </div>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex-grow">
            {isLoadingStudentCompatibility && shouldFilterStudents && (
              <div className="py-2 px-4 mb-2 bg-blue-50 text-blue-700 rounded shadow-sm">
                互換性のある生徒を検索中...
              </div>
            )}
            <StudentTable
              students={students as StudentWithPreference[]}
              selectedStudentId={selectedStudentId}
              onStudentSelect={handleStudentSelect}
              lessons={classSessions as unknown as ClassSession[]}
              subjects={subjects as Subject[]}
              grades={grades as Grade[]}
              studentTypes={studentTypes as StudentType[]}
              selectedTeacherId={selectedTeacherId}
              filteredStudents={shouldFilterStudents ? cachedFilteredStudents : undefined}
              kibouSubjects={teacherKibouSubjects}
              onStudentFiltersChange={handleStudentFiltersChange}
              currentSubjectFilters={studentSubjectFilters}
              currentGradeFilter={studentGradeFilter}
              currentStudentTypeFilters={studentTypeFilters}
              currentSchoolTypeFilter={studentSchoolTypeFilter}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <LessonScheduleModal
          open={isModalOpen}
          lessons={getFilteredClassSessions()}
          onClose={closeModal}
          teacherId={selectedTeacherId || ""}
          studentId={selectedStudentId || ""}
          teacherName={
            teachers.find((t: Teacher) => t.teacherId === selectedTeacherId)?.name || ""
          }
          studentName={
            students.find((s: Student) => s.studentId === selectedStudentId)?.name || ""
          }
          onAddLesson={handleAddClassSession}
        />
      )}
    </div>
  );
}