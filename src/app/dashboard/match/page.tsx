"use client";

import { useState } from "react";
import TeacherTable from "../../../components/match/teacher-table";
import StudentTable from "../../../components/match/student-table";
import LessonScheduleModal from "../../../components/match/lesson-schedule-modal";
import { Button } from "@/components/ui/button";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useGrades } from "@/hooks/useGradeQuery";
import { useEvaluations } from "@/hooks/useEvaluationQuery";
import { useTeacherSubjects } from "@/hooks/useTeacherSubjectQuery";
import { useClassSessions } from "@/hooks/useClassSessionQuery";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentWithPreference } from "@/schemas/student.schema";
import { Grade } from "@/schemas/grade.schema";
import { Subject } from "@/schemas/subject.schema";
import { Teacher } from "@/schemas/teacher.schema";
import { TeacherSubject } from "@/schemas/teacherSubject.schema";
import { Evaluation } from "@/schemas/evaluation.schema";
import {
  useFilteredStudents,
  useFilteredTeachers,
} from "@/components/match/use-filtered-entities";
import { ClassSession as PrismaClassSession, StudentType } from "@prisma/client";


// ------------------------------ 型定義 ------------------------------
// Prisma の ClassSession に UI で必要なプロパティを追加
export type ClassSession = PrismaClassSession & {
  id?: string;
  subject?: Subject | null;
  dayOfWeek?: string | number;
  name?: string;
  status?: string;
  teacherName?: string;
  studentName?: string;
  room?: string;
};

/* ----------------------------- 画面コンポーネント ----------------------------- */
export default function LessonManagementPage() {
  /* -------------------- 選択状態 -------------------- */
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstSelection, setFirstSelection] =
    useState<"teacher" | "student" | null>(null);
  const { data: teachers = [], isLoading: teachersLoading } = useTeachers({
    page: 1,
    pageSize: 1000,
  });
  const {
    data: studentsFromApi = [],
    isLoading: studentsLoading,
  } = useStudents({
    page: 1,
    pageSize: 1000,
  });
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects(1, 1000);
  const { data: grades = [], isLoading: gradesLoading } = useGrades(1, 1000);
  const { data: evaluations = [], isLoading: evaluationsLoading } =
    useEvaluations(1, 1000);
  const {
    data: teacherSubjects = [],
    isLoading: teacherSubjectsLoading,
  } = useTeacherSubjects(1, 1000);
  const {
    data: classSessions = [],
    isLoading: classSessionsLoading,
  } = useClassSessions({});
  const { data: studentTypes = [], isLoading: studentTypesLoading } =
    useStudentTypes(1, 1000);

  /* -------------------- 生徒データ整形 -------------------- */
  const students: StudentWithPreference[] = studentsFromApi.map((student) => ({
    ...student,
    preference: student.studentRegularPreferences?.[0]
      ? {
          preferredSubjects: student.studentRegularPreferences[0].preferredSubjects,
          preferredTeachers: student.studentRegularPreferences[0].preferredTeachers,
          desiredTimes: Array.isArray(student.studentRegularPreferences[0].preferredWeekdaysTimes)
            ? student.studentRegularPreferences[0].preferredWeekdaysTimes as {
                dayOfWeek: string;
                startTime: string;
                endTime: string;
              }[]
            : [],
          additionalNotes: student.studentRegularPreferences[0].notes ?? null,
        }
      : null,
  }));

  /* -------------------- フィルタリング -------------------- */
  const { filteredTeachers, kibouSubjects: studentKibouSubjects } =
    useFilteredTeachers(
      teachers as Teacher[],
      selectedStudentId,
      students,
      subjects as Subject[],
      teacherSubjects as TeacherSubject[],
    );

  const { filteredStudents, kibouSubjects: teacherKibouSubjects } =
    useFilteredStudents(
      students,
      selectedTeacherId,
      teachers as Teacher[],
      subjects as Subject[],
      teacherSubjects as TeacherSubject[],
    );

  /* -------------------- ハンドラ -------------------- */
  const handleTeacherSelect = (teacherId: string) => {
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
  };

  const handleStudentSelect = (studentId: string) => {
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
  };

  /* -------------------- その他ロジック（変更なし） -------------------- */
  const shouldFilterTeachers = selectedStudentId !== null;

  const shouldFilterStudents = selectedTeacherId !== null;

  const isButtonActive =
    selectedTeacherId !== null && selectedStudentId !== null;

  const getFilteredClassSessions = () => {
    return classSessions.filter(
      (session) =>
        session.teacherId === selectedTeacherId ||
        session.studentId === selectedStudentId,
    ) as ClassSession[];
  };

  const openModal = () => {
    if (isButtonActive) {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleAddClassSession = (session: Partial<ClassSession>) => {
    console.log("追加された新規クラスセッション:", session);
  };

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
            <TeacherTable
              teachers={teachers as Teacher[]}
              selectedTeacherId={selectedTeacherId}
              onTeacherSelect={handleTeacherSelect}
              /* 既存コンポーネント互換のため prop 名は lessons のまま */
              lessons={classSessions as unknown as ClassSession[]}
              subjects={subjects as Subject[]}
              evaluations={evaluations as Evaluation[]}
              teacherSubjects={teacherSubjects as TeacherSubject[]}
              selectedStudentId={selectedStudentId}
              filteredTeachers={shouldFilterTeachers ? filteredTeachers : undefined}
              kibouSubjects={shouldFilterTeachers ? studentKibouSubjects : []}
            />
          </div>
        </div>

        {/* 生徒テーブル */}
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <StudentTable
              students={students as StudentWithPreference[]}
              selectedStudentId={selectedStudentId}
              onStudentSelect={handleStudentSelect}
              /* 既存コンポーネント互換のため prop 名は lessons のまま */
              lessons={classSessions as unknown as ClassSession[]}
              subjects={subjects as Subject[]}
              grades={grades as Grade[]}
              studentTypes={studentTypes as StudentType[]}
              selectedTeacherId={selectedTeacherId}
              filteredStudents={shouldFilterStudents ? filteredStudents : undefined}
              kibouSubjects={shouldFilterStudents ? teacherKibouSubjects : []}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <LessonScheduleModal
          open={isModalOpen}
          /* 既存コンポーネント互換のため prop 名は lessons のまま */
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
