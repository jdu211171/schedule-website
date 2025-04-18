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
import { Skeleton } from "@/components/ui/skeleton";
import { Lesson, StudentType } from "@/components/match/types";

// Временная заглушка для lessons, так как у нас нет соответствующего хука
const dummyLessons: Lesson[] = [
  {
    id: "l1",
    name: "代数学習",
    dayOfWeek: "月曜日",
    startTime: "09:00",
    endTime: "09:45",
    status: "有効",
    teacherId: "clq05b5w4000014huk7hc2xg2", 
    studentId: "clq05b5w5000114huk67mbpka", 
  },
  {
    id: "l2",
    name: "物理演習",
    dayOfWeek: "火曜日",
    startTime: "10:00",
    endTime: "10:45",
    status: "有効",
    teacherId: "clq05b5w4000214huk9i1a5d2", 
    studentId: "clq05b5w5000114huk67mbpka", 
  },
];

export default function LessonManagementPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Запрашиваем данные через API с помощью готовых хуков
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: evaluations, isLoading: evaluationsLoading } = useEvaluations();
  const { data: teacherSubjects, isLoading: teacherSubjectsLoading } = useTeacherSubjects();

  // Удалены неиспользуемые хуки useSubjectTypes и useClassTypes
  
  // Тип для типов студентов (так как у нас нет соответствующего хука)
  const studentTypes: StudentType[] = [];

  const lessons = dummyLessons;
  const lessonsLoading = false;

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherId(teacherId === selectedTeacherId ? null : teacherId);
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId === selectedStudentId ? null : studentId);
  };

  const isButtonActive = selectedTeacherId !== null && selectedStudentId !== null;

  const getFilteredLessons = () => {
    return lessons.filter(
      (lesson) =>
        lesson.teacherId === selectedTeacherId &&
        lesson.studentId === selectedStudentId
    );
  };

  const openModal = () => {
    if (isButtonActive) {
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Проверяем, загружаются ли данные
  const isLoading = 
    teachersLoading || 
    studentsLoading || 
    lessonsLoading || 
    subjectsLoading || 
    gradesLoading || 
    evaluationsLoading || 
    teacherSubjectsLoading;
  
  // Удалены упоминания subjectTypesLoading и classTypesLoading

  // Если данные загружаются, показываем скелетон-загрузчик
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[500px]">
        {/* Заголовки с выбранными элементами и кнопка метчинга */}
        <div className="col-span-2 flex justify-between items-center mb-2">
          <div className="flex items-center min-w-[200px]">
            <h2 className="text-xl font-semibold">先生:</h2>
            {selectedTeacherId && teachers ? (
  <span className="ml-2 text-green-700 font-medium">
    {teachers.find((t: { teacherId: string; name: string }) => t.teacherId === selectedTeacherId)?.name}
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
              レッスンを編集
            </Button>
          </div>
          
          <div className="flex items-center min-w-[200px] justify-end">
            <h2 className="text-xl font-semibold">生徒:</h2>
            {selectedStudentId && students ? (
  <span className="ml-2 text-blue-700 font-medium truncate">
    {students.find((s: { studentId: string; name: string }) => s.studentId === selectedStudentId)?.name}
  </span>
) : (
  <span className="ml-2 text-gray-400 italic">未選択</span>
)}
          </div>
        </div>
        
        {/* Обертка для таблицы учителей */}
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <TeacherTable
              teachers={teachers || []}
              selectedTeacherId={selectedTeacherId}
              onTeacherSelect={handleTeacherSelect}
              lessons={lessons}
              subjects={subjects || []}
              evaluations={evaluations || []}
              teacherSubjects={teacherSubjects || []}
            />
          </div>
        </div>

        {/* Обертка для таблицы студентов */}
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <StudentTable
              students={students || []}
              selectedStudentId={selectedStudentId}
              onStudentSelect={handleStudentSelect}
              lessons={lessons}
              subjects={subjects || []}
              grades={grades || []}
              studentTypes={studentTypes}
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <LessonScheduleModal
          open={isModalOpen}
          lessons={getFilteredLessons()}
          onClose={closeModal}
          teacherName={
            teachers?.find((t: { teacherId: string; name: string }) => t.teacherId === selectedTeacherId)?.name || ""
          }
          studentName={
            students?.find((s: { studentId: string; name: string }) => s.studentId === selectedStudentId)?.name || ""
          }
        />
      )}
    </div>
  );
}