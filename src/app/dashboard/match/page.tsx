"use client";

import { useState } from "react";
import TeacherTable from "../../../components/match/teacher-table";
import StudentTable from "../../../components/match/student-table";
import LessonScheduleModal from "../../../components/match/lesson-schedule-modal";
import { Teacher, Student, Lesson } from "../../../components/match/types";

// Фиктивные данные для учителей
const dummyTeachers: Teacher[] = [
  { id: "t1", name: "山田 太郎", subject: ["数学", "英語", "情報"] },
  { id: "t2", name: "山田 太郎", subject: ["数学", "物理"] },
  { id: "t3", name: "佐藤 花子", subject: ["物理", "化学"] },
  { id: "t4", name: "鈴木 一郎", subject: ["歴史", "地理"] },
  { id: "t5", name: "高橋 美咲", subject: ["英語", "文学"] },
  { id: "t6", name: "伊藤 健", subject: ["情報", "数学"] },
  { id: "t7", name: "山田 太郎", subject: ["数学", "英語", "情報"] },
  { id: "t8", name: "山田 太郎", subject: ["数学", "物理"] },
  { id: "t9", name: "佐藤 花子", subject: ["物理"] },
  { id: "t10", name: "山田 太郎", subject: [] },
  { id: "t11", name: "佐藤 花子", subject: [] },
];

// Фиктивные данные для учеников
const dummyStudents: Student[] = [
  { id: "s1", name: "中村 光", subject: ["英語", "文学"] },
  { id: "s2", name: "田中 優子", subject: ["歴史", "地理"] },
  { id: "s3", name: "小林 翼", subject: ["数学", "英語", "情報"] },
  { id: "s4", name: "加藤 真由", subject: ["化学"] },
  { id: "s5", name: "斎藤 翔", subject: ["物理"] },
  { id: "s6", name: "田中 優子", subject: ["歴史", "地理"] },
  { id: "s7", name: "小林 翼", subject: ["数学", "英語", "情報"] },
  { id: "s8", name: "斎藤 翔", subject: ["物理"] },
  { id: "s9", name: "田中 優子", subject: ["歴史", "地理"] },
  { id: "s10", name: "佐藤 花子", subject: ["物理", "化学"] },
  { id: "s11", name: "鈴木 一郎", subject: ["歴史", "地理"] },
  { id: "s12", name: "高橋 美咲", subject: [] },
];

// Фиктивные данные для уроков
const dummyLessons: Lesson[] = [
  {
    id: "l1",
    name: "代数",
    dayOfWeek: "月曜日",
    startTime: "09:00",
    endTime: "09:45",
    status: "有効",
    teacherId: "t1",
    studentId: "s1",
  },
  {
    id: "l2",
    name: "物理",
    dayOfWeek: "火曜日",
    startTime: "10:00",
    endTime: "10:45",
    status: "有効",
    teacherId: "t2",
    studentId: "s1",
  },
  {
    id: "l3",
    name: "日本の歴史",
    dayOfWeek: "水曜日",
    startTime: "11:00",
    endTime: "11:45",
    status: "キャンセル",
    teacherId: "t3",
    studentId: "s2",
  },
  {
    id: "l4",
    name: "英語",
    dayOfWeek: "木曜日",
    startTime: "12:00",
    endTime: "12:45",
    status: "有効",
    teacherId: "t4",
    studentId: "s3",
  },
  {
    id: "l5",
    name: "プログラミング",
    dayOfWeek: "金曜日",
    startTime: "13:00",
    endTime: "13:45",
    status: "有効",
    teacherId: "t5",
    studentId: "s4",
  },
  // Добавляем еще несколько уроков для демонстрации множественных уроков на учителя/ученика
  {
    id: "l6",
    name: "幾何学",
    dayOfWeek: "水曜日",
    startTime: "14:00",
    endTime: "14:45",
    status: "有効",
    teacherId: "t1",
    studentId: "s2",
  },
  {
    id: "l7",
    name: "世界の歴史",
    dayOfWeek: "金曜日",
    startTime: "15:00",
    endTime: "15:45",
    status: "有効",
    teacherId: "t3",
    studentId: "s1",
  },
  {
    id: "l8",
    name: "ビジネス英語",
    dayOfWeek: "月曜日",
    startTime: "16:00",
    endTime: "16:45",
    status: "有効",
    teacherId: "t4",
    studentId: "s5",
  },
];

export default function LessonManagementPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherId(teacherId === selectedTeacherId ? null : teacherId);
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId === selectedStudentId ? null : studentId);
  };

  const isButtonActive =
    selectedTeacherId !== null && selectedStudentId !== null;

  const getFilteredLessons = () => {
    return dummyLessons.filter(
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

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">授業管理</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-4">先生</h2>
          <TeacherTable
            teachers={dummyTeachers}
            selectedTeacherId={selectedTeacherId}
            onTeacherSelect={handleTeacherSelect}
            lessons={dummyLessons}
          />
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-4">生徒</h2>
          <StudentTable
            students={dummyStudents}
            selectedStudentId={selectedStudentId}
            onStudentSelect={handleStudentSelect}
            lessons={dummyLessons}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={openModal}
          disabled={!isButtonActive}
          className={`px-6 py-2 rounded-lg font-medium ${
            isButtonActive
              ? "bg-gray-700 text-white hover:bg-gray-800"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          レッスンを編集
        </button>
      </div>

      {isModalOpen && (
        <LessonScheduleModal
          lessons={getFilteredLessons()}
          onClose={closeModal}
          teacherName={
            dummyTeachers.find((t) => t.id === selectedTeacherId)?.name || ""
          }
          studentName={
            dummyStudents.find((s) => s.id === selectedStudentId)?.name || ""
          }
        />
      )}
    </div>
  );
}
