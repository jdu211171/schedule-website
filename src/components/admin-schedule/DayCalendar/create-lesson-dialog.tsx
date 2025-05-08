import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjects } from '@/hooks/useSubjectQuery';
import { useTeachers } from '@/hooks/useTeacherQuery';
import { useStudents } from '@/hooks/useStudentQuery';
import { NewLessonData } from './admin-calendar-day';

interface Room {
  boothId: string;
  name: string;
}

interface CreateLessonDialogPayload extends NewLessonData {
  subjectId: string;
  teacherId: string;
  studentId: string;
}

type CreateLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonData: NewLessonData;
  onSave: (data: CreateLessonDialogPayload) => void;
  rooms: Room[];
};

export const CreateLessonDialog: React.FC<CreateLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonData,
  onSave,
  rooms
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [studentId, setStudentId] = useState('');

  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({ limit: 100 });
  const subjects = subjectsResponse?.data || [];

  const { data: teachersResponse, isLoading: isLoadingTeachers } = useTeachers({ limit: 100 });
  const teachers = teachersResponse?.data || [];

  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({ limit: 100 });
  const students = studentsResponse?.data || [];

  // Сброс состояний формы при открытии диалога
  useEffect(() => {
    if (open) {
      setSubjectId('');
      setTeacherId('');
      setStudentId('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!subjectId || !teacherId || !studentId) {
      console.error("Не все поля выбраны для создания урока.");
      return;
    }

    onSave({
      date: lessonData.date,
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
      roomId: lessonData.roomId,
      subjectId: subjectId,
      teacherId: teacherId,
      studentId: studentId
    });

    onOpenChange(false); 
  };

  const isLoading = isLoadingSubjects || isLoadingTeachers || isLoadingStudents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新しい授業の作成</DialogTitle>
          <DialogDescription>
            新しい授業の情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">日付</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {format(lessonData.date, 'yyyy年MM月dd日', { locale: ja })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">教室</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {rooms.find(room => room.boothId === lessonData.roomId)?.name || lessonData.roomId}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">開始時間</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {lessonData.startTime}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">終了時間</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {lessonData.endTime}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="subject-select" className="text-sm font-medium mb-1 block">科目</label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={isLoading}>
              <SelectTrigger id="subject-select" className="w-full transition-all duration-200 hover:bg-slate-100 cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={isLoadingSubjects ? "科目を読み込み中..." : "科目を選択"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {subjects.map(subject => (
                  <SelectItem
                    key={subject.subjectId}
                    value={subject.subjectId}
                    className="cursor-pointer transition-colors duration-150 hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 rounded-sm data-[highlighted]:bg-slate-100"
                  >
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="teacher-select" className="text-sm font-medium mb-1 block">講師</label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={isLoading}>
              <SelectTrigger id="teacher-select" className="w-full transition-all duration-200 hover:bg-slate-100 cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={isLoadingTeachers ? "講師を読み込み中..." : "講師を選択"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {teachers.map(teacher => (
                  <SelectItem
                    key={teacher.teacherId}
                    value={teacher.teacherId}
                    className="cursor-pointer transition-colors duration-150 hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 rounded-sm data-[highlighted]:bg-slate-100"
                  >
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="student-select" className="text-sm font-medium mb-1 block">生徒</label>
            <Select value={studentId} onValueChange={setStudentId} disabled={isLoading}>
              <SelectTrigger id="student-select" className="w-full transition-all duration-200 hover:bg-slate-100 cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={isLoadingStudents ? "生徒を読み込み中..." : "生徒を選択"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {students.map(student => (
                  <SelectItem
                    key={student.studentId}
                    value={student.studentId}
                    className="cursor-pointer transition-colors duration-150 hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 rounded-sm data-[highlighted]:bg-slate-100"
                  >
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
            onClick={handleSubmit}
            disabled={isLoading || !subjectId || !teacherId || !studentId}
          >
            {isLoading ? "読み込み中..." : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
