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
  TeacherSubject,
  Evaluation,
  StudentType,
  ClassSession
} from "@/components/match/types";

/* ----------------------------- 画面コンポーネント ----------------------------- */
export default function LessonManagementPage() {
  /* -------------------- 選択状態 -------------------- */
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstSelection, setFirstSelection] = useState<"teacher" | "student" | null>(null);

  /* -------------------- フィルタリング結果のキャッシュ -------------------- */
  const [cachedFilteredTeachers, setCachedFilteredTeachers] = useState<Teacher[]>([]);
  const [cachedFilteredStudents, setCachedFilteredStudents] = useState<StudentWithPreference[]>([]);
  const [studentKibouSubjects, setStudentKibouSubjects] = useState<Subject[]>([]);
  const [teacherKibouSubjects, setTeacherKibouSubjects] = useState<Subject[]>([]);
  
  /* -------------------- 互換性読み込みインジケータ -------------------- */
  const [isLoadingTeacherCompatibility, setIsLoadingTeacherCompatibility] = useState(false);
  const [isLoadingStudentCompatibility, setIsLoadingStudentCompatibility] = useState(false);

  /* -------------------- データ取得 -------------------- */
  const { data: teachersData, isLoading: teachersLoading } = useMatchTeachers({
    page: 1,
    limit: 100, // より多くのデータを取得するために制限を増やす
  });
  const teachers = teachersData?.data || [];

  const { data: studentsData, isLoading: studentsLoading } = useMatchStudents({
    page: 1,
    limit: 100, // 制限を増やす
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

  /* -------------------- 生徒データ整形 -------------------- */
  const students = useMemo(() => studentsFromApi.map((student) => ({
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

  /* -------------------- 科目の取得ロジック -------------------- */
  // 学生の科目を取得する関数
  const getStudentSubjects = useCallback((studentId: string | null): Subject[] => {
    if (!studentId) return [];
    
    const student = students.find(s => s.studentId === studentId);
    if (!student || !student.preference || !student.preference.preferredSubjects) return [];
    
    const preferredSubjectIds = student.preference.preferredSubjects;
    return subjects.filter(subject => preferredSubjectIds.includes(subject.subjectId));
  }, [students, subjects]);

  // 先生の科目を取得する関数
  const getTeacherSubjects = useCallback((teacherId: string | null): Subject[] => {
    if (!teacherId) return [];
    
    const teacherSubjectsData = teacherSubjects.filter(
      (ts: TeacherSubject) => ts.teacherId === teacherId
    );
    const subjectIds = teacherSubjectsData.map((ts: TeacherSubject) => ts.subjectId);
    
    return subjects.filter(subject => subjectIds.includes(subject.subjectId));
  }, [teacherSubjects, subjects]);

  /* -------------------- 互換性機能 -------------------- */
  const { 
    data: compatibleTeachersData, 
    isLoading: compatibleTeachersLoading 
  } = useCompatibleTeachers(selectedStudentId);
  
  const { 
    data: compatibleStudentsData, 
    isLoading: compatibleStudentsLoading 
  } = useCompatibleStudents(selectedTeacherId);

  // 選択時に先に科目情報を設定
  useEffect(() => {
    if (selectedStudentId) {
      // 学生を選択した場合、すぐに彼の科目を表示する
      const studentSubjects = getStudentSubjects(selectedStudentId);
      if (studentSubjects.length > 0) {
        setStudentKibouSubjects(studentSubjects);
      }
    }
  }, [selectedStudentId, getStudentSubjects]);

  useEffect(() => {
    if (selectedTeacherId) {
      // 先生を選択した場合、すぐに彼の科目を表示する
      const teacherSubjects = getTeacherSubjects(selectedTeacherId);
      if (teacherSubjects.length > 0) {
        setTeacherKibouSubjects(teacherSubjects);
      }
    }
  }, [selectedTeacherId, getTeacherSubjects]);

  // APIからの互換性データを処理
  useEffect(() => {
    setIsLoadingTeacherCompatibility(compatibleTeachersLoading);
    
    if (compatibleTeachersData && !compatibleTeachersLoading) {
      console.log("Received compatible teachers:", compatibleTeachersData);
      setCachedFilteredTeachers(compatibleTeachersData.filteredTeachers || []);
      
      if (compatibleTeachersData.kibouSubjects && compatibleTeachersData.kibouSubjects.length > 0) {
        setStudentKibouSubjects(compatibleTeachersData.kibouSubjects);
      }
    } else if (!selectedStudentId) {
      setCachedFilteredTeachers([]);
      setStudentKibouSubjects([]);
    }
  }, [compatibleTeachersData, compatibleTeachersLoading, selectedStudentId]);

  useEffect(() => {
    setIsLoadingStudentCompatibility(compatibleStudentsLoading);
    
    if (compatibleStudentsData && !compatibleStudentsLoading) {
      console.log("Received compatible students:", compatibleStudentsData);
      setCachedFilteredStudents(compatibleStudentsData.filteredStudents || []);
      
      if (compatibleStudentsData.kibouSubjects && compatibleStudentsData.kibouSubjects.length > 0) {
        setTeacherKibouSubjects(compatibleStudentsData.kibouSubjects);
      }
    } else if (!selectedTeacherId) {
      setCachedFilteredStudents([]);
      setTeacherKibouSubjects([]);
    }
  }, [compatibleStudentsData, compatibleStudentsLoading, selectedTeacherId]);

  /* -------------------- ハンドラ -------------------- */
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

  /* -------------------- その他ロジック -------------------- */
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
    console.log("追加された新規クラスセッション:", session);
    // APIを呼び出してセッションを保存する
  }, []);

  /* -------------------- デバッグログ -------------------- */
  useEffect(() => {
    if (teacherKibouSubjects.length > 0) {
      console.log("Teacher Kibou Subjects:", teacherKibouSubjects);
    }
    if (studentKibouSubjects.length > 0) {
      console.log("Student Kibou Subjects:", studentKibouSubjects);
    }
  }, [teacherKibouSubjects, studentKibouSubjects]);

  /* -------------------- ローディング判定 -------------------- */
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
        {/* ヘッダー (選択された先生・生徒と編集ボタン) */}
        <div className="col-span-2 flex justify-between items-center mb-2">
          <div className="flex items-center min-w-[200px]">
            <h2 className="text-xl font-semibold">先生:</h2>
            {selectedTeacherId && teachers ? (
              <span className="ml-2 text-green-700 font-medium">
                {teachers.find((t) => t.teacherId === selectedTeacherId)?.name}
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
                {students.find((s) => s.studentId === selectedStudentId)?.name}
              </span>
            ) : (
              <span className="ml-2 text-gray-400 italic">未選択</span>
            )}
          </div>
        </div>

        {/* 先生テーブル */}
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
              kibouSubjects={studentKibouSubjects} // 常に科目を渡す、フィルタリング前でも
            />
          </div>
        </div>

        {/* 生徒テーブル */}
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
              kibouSubjects={teacherKibouSubjects} // 常に科目を渡す、フィルタリング前でも
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
            teachers.find((t) => t.teacherId === selectedTeacherId)?.name || ""
          }
          studentName={
            students.find((s) => s.studentId === selectedStudentId)?.name || ""
          }
          onAddLesson={handleAddClassSession}
        />
      )}
    </div>
  );
}