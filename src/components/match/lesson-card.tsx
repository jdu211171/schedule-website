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
    current: "bg-white border-gray-300 hover:border-gray-400",
    teacher: "bg-green-50 border-green-200 hover:border-green-300",
    student: "bg-blue-50 border-blue-200 hover:border-blue-300",
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
  
  const handleCardClick = () => {
    if (onLessonClick && isEditable) {
      onLessonClick(lesson);
    }
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем клик по карточке
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