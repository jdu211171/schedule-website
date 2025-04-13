import { useState } from "react";
import { Lesson } from "./types";

interface LessonScheduleModalProps {
  lessons: Lesson[];
  onClose: () => void;
  teacherName: string;
  studentName: string;
}

export default function LessonScheduleModal({
  lessons,
  onClose,
  teacherName,
  studentName,
}: LessonScheduleModalProps) {
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "активен":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">アクティブ</span>;
      case "отменен":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">キャンセル</span>;
      case "перенесен":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">移籍</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">スケジュール</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="mt-2">
            <p className="text-gray-600">
              <span className="font-semibold">先生:</span> {teacherName}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">生徒:</span> {studentName}
            </p>
          </div>
        </div>

        <div className="overflow-auto p-6 flex-grow">
          {lessons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    授業名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    曜日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    開始時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    終了時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    行動
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lesson.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lesson.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lesson.dayOfWeek}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lesson.startTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lesson.endTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatStatus(lesson.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingLessonId(lesson.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            編集
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                          削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">
              この教師と生徒のペアのレッスンは見つかりませんでした。
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            閉じる
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          新しい授業を追加する
          </button>
        </div>
      </div>
    </div>
  );
}