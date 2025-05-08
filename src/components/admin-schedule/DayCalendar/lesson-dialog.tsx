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
import { ClassSession } from '@/hooks/useScheduleClassSessions';
import { useSubjects } from '@/hooks/useSubjectQuery';
import { useTeachers } from '@/hooks/useTeacherQuery';
import { useStudents } from '@/hooks/useStudentQuery';

interface Room {
  boothId: string;
  name: string;
}

interface EditableLesson extends Partial<ClassSession> {
  formattedStartTime?: string;
  formattedEndTime?: string;
}

interface ExpectedUpdatePayload extends Partial<ClassSession> {
  classId: string; 
}

// Функция форматирования времени из ISO (или HH:MM) в HH:MM
const formatTimeFromISO = (isoTime: string | undefined): string => {
  if (!isoTime) return '';
  try {
    if (isoTime.includes('T') && isoTime.includes(':')) {
      const date = new Date(isoTime);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (isoTime.includes(':')) {
      const parts = isoTime.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return '';
  } catch (error) {
    console.error('Ошибка форматирования времени:', error);
    return '';
  }
};

// Функция конвертации времени HH:MM в "фиктивный" ISO (только время важно для API)
const convertTimeToISO = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(1970, 0, 1, hours, minutes);
    return date.toISOString();
  } catch (error) {
    console.error('Ошибка преобразования времени в ISO:', error);
    return new Date(1970, 0, 1, 0, 0).toISOString();
  }
};

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: ClassSession;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  onSave: (updatedLesson: ExpectedUpdatePayload) => void; 
  onDelete: (lessonId: string) => void;
  rooms?: Room[];
};

export const LessonDialog: React.FC<LessonDialogProps> = ({
  open,
  onOpenChange,
  lesson,
  mode,
  onModeChange,
  onSave,
  onDelete,
  rooms = []
}) => {
  const [editedLesson, setEditedLesson] = useState<EditableLesson | null>(null);

  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useSubjects({ limit: 100 });
  const subjects = subjectsResponse?.data || [];

  const { data: teachersResponse, isLoading: isLoadingTeachers } = useTeachers({ limit: 100 });
  const teachers = teachersResponse?.data || [];

  const { data: studentsResponse, isLoading: isLoadingStudents } = useStudents({ limit: 100 });
  const students = studentsResponse?.data || [];

  useEffect(() => {
    if (lesson && open) {
      setEditedLesson({
        ...lesson,
        formattedStartTime: formatTimeFromISO(lesson.startTime),
        formattedEndTime: formatTimeFromISO(lesson.endTime)
      });
    } else if (!open) {
      setEditedLesson(null);
    }
  }, [lesson, open]);

  if (!lesson || !editedLesson) return null;

  const handleDelete = () => {
    if (window.confirm('本当にこの授業を削除しますか？')) {
      onDelete(lesson.classId);
      onOpenChange(false);
    }
  };

  const handleSave = () => {
    if (!editedLesson || !editedLesson.classId) { 
        console.error("Ошибка: ID урока отсутствует в редактируемых данных.");
        return;
    }

    const lessonToSave: ExpectedUpdatePayload = {
      ...editedLesson,
      classId: editedLesson.classId, 
      startTime: editedLesson.formattedStartTime
        ? convertTimeToISO(editedLesson.formattedStartTime)
        : editedLesson.startTime,
      endTime: editedLesson.formattedEndTime
        ? convertTimeToISO(editedLesson.formattedEndTime)
        : editedLesson.endTime,
    };

    delete (lessonToSave as EditableLesson).formattedStartTime;
    delete (lessonToSave as EditableLesson).formattedEndTime;

    onSave(lessonToSave);
    onModeChange('view');
  };

  const handleInputChange = (field: keyof EditableLesson, value: string | number | boolean | null) => {
    setEditedLesson((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };
  
  const isLoading = isLoadingSubjects || isLoadingTeachers || isLoadingStudents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? '授業の詳細' : '授業の編集'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' ? '授業の詳細情報です' : '授業の情報を更新してください'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">日付</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {format(new Date(lesson.date), 'yyyy年MM月dd日', { locale: ja })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">教室</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {rooms.length > 0
                  ? (rooms.find(room => room.boothId === lesson.boothId)?.name || `教室 ID: ${lesson.boothId}`)
                  : `教室 ID: ${lesson.boothId}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">科目</label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.subjectId || ''}
                  onValueChange={(value) => handleInputChange('subjectId', value)}
                  disabled={isLoadingSubjects}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-slate-100 cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={isLoadingSubjects ? "読み込み中..." : "科目を選択"} />
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
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                  {lesson.subject?.name || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">授業タイプ</label>
              <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                {lesson.classType?.name || '指定なし'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">講師</label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.teacherId || ''}
                  onValueChange={(value) => handleInputChange('teacherId', value)}
                  disabled={isLoadingTeachers}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-slate-100 cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={isLoadingTeachers ? "読み込み中..." : "講師を選択"} />
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
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                  {lesson.teacher?.name || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">生徒</label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.studentId || ''}
                  onValueChange={(value) => handleInputChange('studentId', value)}
                  disabled={isLoadingStudents}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-slate-100 cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={isLoadingStudents ? "読み込み中..." : "生徒を選択"} />
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
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                  {lesson.student?.name || '指定なし'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">開始時間</label>
              {mode === 'edit' ? (
                <input
                  type="time"
                  className="w-full border rounded-md p-2 mt-1 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200 cursor-pointer"
                  value={editedLesson.formattedStartTime || ''}
                  onChange={(e) => handleInputChange('formattedStartTime', e.target.value)}
                />
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                  {formatTimeFromISO(lesson.startTime)}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">終了時間</label>
              {mode === 'edit' ? (
                <input
                  type="time"
                  className="w-full border rounded-md p-2 mt-1 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200 cursor-pointer"
                  value={editedLesson.formattedEndTime || ''}
                  onChange={(e) => handleInputChange('formattedEndTime', e.target.value)}
                />
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700">
                  {formatTimeFromISO(lesson.endTime)}
                </div>
              )}
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="text-sm font-medium">メモ</label>
              <textarea
                className="w-full border rounded-md p-2 mt-1 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200 cursor-text"
                rows={3}
                value={editedLesson.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          )}
           {mode === 'view' && lesson.notes && (
             <div>
                <label className="text-sm font-medium">メモ</label>
                <div className="border rounded-md p-2 mt-1 bg-gray-50 text-gray-700 min-h-[60px] whitespace-pre-wrap">
                    {lesson.notes}
                </div>
            </div>
           )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between w-full pt-4">
          {mode === 'edit' ? (
            <>
              <Button
                variant="destructive"
                className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-destructive/30 focus:outline-none"
                onClick={handleDelete}
              >
                削除
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  onClick={() => {
                    onModeChange('view');
                    if (lesson) {
                         setEditedLesson({
                            ...lesson,
                            formattedStartTime: formatTimeFromISO(lesson.startTime),
                            formattedEndTime: formatTimeFromISO(lesson.endTime)
                          });
                    }
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  onClick={handleSave}
                  disabled={isLoading || !editedLesson.subjectId || !editedLesson.teacherId || !editedLesson.studentId}
                >
                  {isLoading ? "保存中..." : "保存"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div /> 
              <div className="flex space-x-2">
                 <Button
                    variant="outline"
                    className="transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    onClick={() => onOpenChange(false)}
                  >
                    閉じる
                  </Button>
                  <Button
                    className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    onClick={() => onModeChange('edit')}
                  >
                    編集
                  </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
