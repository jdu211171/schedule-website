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
import { Lesson, StudentType, Grade } from "@/components/match/types";
import { useFilteredStudents, useFilteredTeachers } from "@/components/match/use-filtered-entities";
import { 
  mockStudents, 
  mockTeachers, 
  mockSubjects, 
  mockTeacherSubjects, 
  studentPreferences,
  mockLessons
} from "@/components/match/mock-data";

const mockEvaluations = [
  {
    evaluationId: 'eval1',
    name: 'A評価',
    score: 5,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    evaluationId: 'eval2',
    name: 'B評価',
    score: 4,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    evaluationId: 'eval3',
    name: 'C評価',
    score: 3,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockGrades: Grade[] = [
  {
    gradeId: 'grade1',
    name: '中学2年',
    studentTypeId: 'type1',
    gradeYear: 2,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    gradeId: 'grade2',
    name: '中学3年',
    studentTypeId: 'type1',
    gradeYear: 3,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default function LessonManagementPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [useMockData, setUseMockData] = useState(true); 

  const [firstSelection, setFirstSelection] = useState<'teacher' | 'student' | null>(null);

  // Запрашиваем данные через API с помощью готовых хуков
  const { data: apiTeachers = [], isLoading: teachersLoading } = useTeachers();
  const { data: apiStudents = [], isLoading: studentsLoading } = useStudents();
  const { data: apiSubjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: apiGrades = [], isLoading: gradesLoading } = useGrades();
  const { data: apiEvaluations = [], isLoading: evaluationsLoading } = useEvaluations();
  const { data: apiTeacherSubjects = [], isLoading: teacherSubjectsLoading } = useTeacherSubjects();

  const teachers = useMockData ? mockTeachers : apiTeachers;
  
  // Добавляем вручную preference к студентам для моковых данных
  const students = useMockData 
    ? mockStudents.map(student => ({
        ...student,
        preference: studentPreferences[student.studentId as keyof typeof studentPreferences] || null
      })) 
    : apiStudents;
  
  const subjects = useMockData ? mockSubjects : apiSubjects;
  const grades = useMockData ? mockGrades : apiGrades;
  const evaluations = useMockData ? mockEvaluations : apiEvaluations;
  const teacherSubjects = useMockData ? mockTeacherSubjects : apiTeacherSubjects;

  // Тип для типов студентов (так как у нас нет соответствующего хука)
  const studentTypes: StudentType[] = [];

  const lessons = mockLessons;
  const lessonsLoading = false;

  // Используем наши хуки фильтрации для отображения связанных учителей и учеников
  const { filteredTeachers, kibouSubjects: studentKibouSubjects } = useFilteredTeachers(
    teachers, 
    selectedStudentId, 
    students, 
    subjects,
    teacherSubjects
  );
  
  const { filteredStudents, kibouSubjects: teacherKibouSubjects } = useFilteredStudents(
    students, 
    selectedTeacherId, 
    teachers, 
    subjects,
    teacherSubjects
  );

  // Обновленный обработчик выбора учителя
  const handleTeacherSelect = (teacherId: string) => {
    if (teacherId === selectedTeacherId) {
      const wasFirstSelection = firstSelection === 'teacher';
      setSelectedTeacherId(null);
      if (wasFirstSelection && selectedStudentId) {
        setFirstSelection('student');
      } else if (!selectedStudentId) {
        setFirstSelection(null);
      }
    } else {
      if (!selectedTeacherId && !selectedStudentId) {
        setFirstSelection('teacher');
      }
      setSelectedTeacherId(teacherId);
    }
  };

  // Обновленный обработчик выбора ученика
  const handleStudentSelect = (studentId: string) => {
    if (studentId === selectedStudentId) {
      const wasFirstSelection = firstSelection === 'student';
      setSelectedStudentId(null);
      if (wasFirstSelection && selectedTeacherId) {
        setFirstSelection('teacher');
      } else if (!selectedTeacherId) {
        setFirstSelection(null);
      }
    } else {
      if (!selectedTeacherId && !selectedStudentId) {
        setFirstSelection('student');
      }
      setSelectedStudentId(studentId);
    }
  };

  const shouldFilterTeachers = firstSelection === 'student' && selectedStudentId !== null;
  const shouldFilterStudents = firstSelection === 'teacher' && selectedTeacherId !== null;

  const isButtonActive = selectedTeacherId !== null && selectedStudentId !== null;

  const getFilteredLessons = () => {
    return lessons.filter(
      (lesson) =>
        lesson.teacherId === selectedTeacherId ||
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

  const handleAddLesson = (lesson: Partial<Lesson>) => {
    console.log("Добавлен новый урок:", lesson);

  };

  const isLoading = 
    !useMockData && (
      teachersLoading || 
      studentsLoading || 
      lessonsLoading || 
      subjectsLoading || 
      gradesLoading || 
      evaluationsLoading || 
      teacherSubjectsLoading
    );

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
      
      {/* Кнопка переключения между моковыми и реальными данными */}
      <div className="mb-4">
        <Button 
          onClick={() => setUseMockData(!useMockData)}
          variant="outline"
          className="mb-4"
        >
          {useMockData ? "テスト用データを使用中" : "本番データを使用中"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[400px]">
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
              teachers={teachers}
              selectedTeacherId={selectedTeacherId}
              onTeacherSelect={handleTeacherSelect}
              lessons={lessons}
              subjects={subjects}
              evaluations={evaluations}
              teacherSubjects={teacherSubjects}
              selectedStudentId={selectedStudentId}
              filteredTeachers={shouldFilterTeachers ? filteredTeachers : undefined}
              kibouSubjects={shouldFilterTeachers ? studentKibouSubjects : []}
            />
          </div>
        </div>

        {/* Обертка для таблицы студентов */}
        <div className="flex flex-col h-full">
          <div className="flex-grow">
            <StudentTable
              students={students}
              selectedStudentId={selectedStudentId}
              onStudentSelect={handleStudentSelect}
              lessons={lessons}
              subjects={subjects}
              grades={grades}
              studentTypes={studentTypes}
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
          lessons={getFilteredLessons()}
          onClose={closeModal}
          teacherId={selectedTeacherId || ""}
          studentId={selectedStudentId || ""}
          teacherName={
            teachers.find((t: { teacherId: string; name: string }) => t.teacherId === selectedTeacherId)?.name || ""
          }
          studentName={
            students.find((s: { studentId: string; name: string }) => s.studentId === selectedStudentId)?.name || ""
          }
          onAddLesson={handleAddLesson}
        />
      )}
    </div>
  );
}