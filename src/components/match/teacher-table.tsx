import { useState } from "react";
import { Teacher, Lesson } from "./types";

interface TeacherTableProps {
  teachers: Teacher[];
  selectedTeacherId: string | null;
  onTeacherSelect: (teacherId: string) => void;
  lessons: Lesson[]; // Добавляем уроки для отображения в третьей колонке
}

export default function TeacherTable({
  teachers,
  selectedTeacherId,
  onTeacherSelect,
  lessons,
}: TeacherTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTeacherLessons = (teacherId: string) => {
    return lessons.filter((lesson) => lesson.teacherId === teacherId);
  };

  const formatLessonsList = (teacherId: string) => {
    const teacherLessons = getTeacherLessons(teacherId);
    if (teacherLessons.length === 0) return "なし";

    const lessonNames = teacherLessons.map((lesson) => lesson.name);
    const displayNames = lessonNames.slice(0, 3);

    return displayNames.join(", ") + (lessonNames.length > 3 ? "..." : "");
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="先生を検索..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>
      <div className="overflow-auto max-h-[60vh]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead
            className="bg-gray-50 sticky top-0 z-10"
            style={{ boxShadow: "0px 1px 1px rgba(0, 0, 0, 0.1)" }}
          >
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                先生名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                授業
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.map((teacher) => (
              <tr
                key={teacher.id}
                onClick={() => onTeacherSelect(teacher.id)}
                className={`cursor-pointer transition-colors ${
                  selectedTeacherId === teacher.id
                    ? "bg-gray-200"
                    : "hover:bg-gray-100"
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {teacher.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {teacher.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatLessonsList(teacher.id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredTeachers.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          検索結果はありません
        </div>
      )}
    </div>
  );
}
