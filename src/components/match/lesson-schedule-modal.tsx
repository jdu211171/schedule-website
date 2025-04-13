import { useState } from "react";
import { Lesson } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LessonScheduleModalProps {
  lessons: Lesson[];
  onClose: () => void;
  teacherName: string;
  studentName: string;
  open?: boolean; 
}

export default function LessonScheduleModal({
  lessons,
  onClose,
  teacherName,
  studentName,
  open = true, 
}: LessonScheduleModalProps) {
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const formatStatus = (status: string) => {
    switch (status) {
      case "有効":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">アクティブ</Badge>;
      case "キャンセル":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">キャンセル</Badge>;
      case "移動":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">移籍</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  // Для обратной совместимости оставляем оба варианта:
  // - Использование Dialog из shadcn если передан параметр open
  // - Использование старого подхода с полноэкранным div иначе
  return open !== undefined ? (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">スケジュール</DialogTitle>
          <div className="mt-2">
            <p className="text-gray-600">
              <span className="font-semibold">先生:</span> {teacherName}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">生徒:</span> {studentName}
            </p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow">
          {lessons.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>授業名</TableHead>
                  <TableHead>曜日</TableHead>
                  <TableHead>開始時間</TableHead>
                  <TableHead>終了時間</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>行動</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="text-gray-500">
                      {lesson.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lesson.name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {lesson.dayOfWeek}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {lesson.startTime}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {lesson.endTime}
                    </TableCell>
                    <TableCell>
                      {formatStatus(lesson.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingLessonId(lesson.id)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                        >
                          編集
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-800 hover:bg-red-100"
                        >
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">
                この教師と生徒のペアのレッスンは見つかりませんでした。
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button className="bg-green-600 text-white hover:bg-green-700">
            新しい授業を追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : (
    // Старая реализация для обратной совместимости
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>授業名</TableHead>
                  <TableHead>曜日</TableHead>
                  <TableHead>開始時間</TableHead>
                  <TableHead>終了時間</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>行動</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="text-gray-500">
                      {lesson.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lesson.name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {lesson.dayOfWeek}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {lesson.startTime}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {lesson.endTime}
                    </TableCell>
                    <TableCell>
                      {formatStatus(lesson.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingLessonId(lesson.id)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                        >
                          編集
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-800 hover:bg-red-100"
                        >
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">
                この教師と生徒のペアのレッスンは見つかりませんでした。
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            新しい授業を追加する
          </Button>
        </div>
      </div>
    </div>
  );
}