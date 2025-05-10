"use client";

import { useState } from "react";
import { DisplayLesson } from "./types";
import { Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LessonCardProps {
  lesson: DisplayLesson;
  onLessonClick?: (lesson: DisplayLesson) => void;
  onLessonDelete?: (lesson: DisplayLesson) => void;
  isEditable: boolean;
  cardType: "teacher" | "student" | "current";
  teacherName: string;
  studentName: string;
}

export default function LessonCard({
  lesson,
  onLessonClick,
  onLessonDelete,
  isEditable = false,
  cardType = "current",
  teacherName,
  studentName
}: LessonCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const cardTypeClasses = {
    current: "bg-white dark:bg-gray-800 border-input hover:bg-accent/50 dark:hover:bg-accent/20",
    teacher: "bg-green-50 dark:bg-green-900/20 border-input",
    student: "bg-blue-50 dark:bg-blue-900/20 border-input",
  };

  const renderLessonTime = () => {
    return (
      <div className="text-xs font-medium">
        {lesson.startTime} - {lesson.endTime}
      </div>
    );
  };

  const renderLessonParticipants = () => {
    if (cardType === "teacher") {
      return (
        <div className="text-xs text-gray-500 truncate" title={`生徒: ${lesson.studentName}`}>
          生徒: {lesson.studentName}
        </div>
      );
    } else if (cardType === "student") {
      return (
        <div className="text-xs text-gray-500 truncate" title={`先生: ${lesson.teacherName}`}>
          先生: {lesson.teacherName}
        </div>
      );
    } else {
      return (
        <div className="text-xs text-gray-500 truncate" title={`${teacherName} - ${studentName}`}>
          {teacherName} - {studentName}
        </div>
      );
    }
  };

  // Форматирование диапазона дат (если они есть)
  const formatDateRange = () => {
    if (!lesson.startDate) return null;

    const startDate = new Date(lesson.startDate);
    const formattedStartDate = `${startDate.getFullYear()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}`;

    if (!lesson.endDate) {
      return (
        <div className="text-xs text-gray-500 truncate" title={`開始日: ${formattedStartDate}`}>
          開始: {formattedStartDate}
        </div>
      );
    }

    const endDate = new Date(lesson.endDate);
    const formattedEndDate = `${endDate.getFullYear()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')}`;

    return (
      <div className="text-xs text-gray-500 truncate" title={`期間: ${formattedStartDate} - ${formattedEndDate}`}>
        期間: {formattedStartDate} - {formattedEndDate}
      </div>
    );
  };

  const handleCardClick = () => {
    if (onLessonClick && isEditable) {
      onLessonClick(lesson);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (onLessonDelete) {
      onLessonDelete(lesson);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div
        className={`mb-1 p-1.5 rounded border text-sm shadow-sm ${cardTypeClasses[cardType]} ${isEditable ? 'cursor-pointer' : ''}`}
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start mb-0.5">
          <div className="font-medium truncate mr-1" title={lesson.name}>
            {lesson.name}
          </div>

          {isEditable && onLessonDelete && (
            <button
              onClick={handleDeleteClick}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="削除"
            >
              <Trash size={15} />
            </button>
          )}
        </div>

        {renderLessonTime()}
        {renderLessonParticipants()}

        {/* Отображение типа класса */}
        {lesson.classTypeName && (
          <div className="text-xs text-gray-500 truncate" title={`タイプ: ${lesson.classTypeName}`}>
            タイプ: {lesson.classTypeName}
          </div>
        )}

        {/* Отображение диапазона дат */}
        {formatDateRange()}

        {lesson.room && (
          <div className="text-xs text-gray-500 truncate" title={`場所: ${lesson.room}`}>
            場所: {lesson.room}
          </div>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>授業の削除</DialogTitle>
            <DialogDescription>
              {lesson.name} ({lesson.dayOfWeek}, {lesson.startTime}-{lesson.endTime}) を削除してもよろしいですか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
