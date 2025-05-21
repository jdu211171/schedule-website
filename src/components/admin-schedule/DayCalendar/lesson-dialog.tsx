import { useState, useEffect, useCallback } from 'react';
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
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { fetcher } from '@/lib/fetcher';
import { getDateString } from '../date';
import { UpdateClassSessionPayload, formatDateToString } from './types/class-session';

// Интерфейс для кабинета
interface Booth {
  boothId: string;
  name: string;
}

interface EditableLessonUI {
  classId: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
  date?: string | Date;
  boothId?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
  subjectId?: string | null;
  classTypeId?: string | null;
  notes?: string | null;
  booth?: { name: string; boothId: string } | null;
  teacher?: { name: string; teacherId: string } | null;
  student?: { name: string; studentId: string } | null;
  subject?: { name: string; subjectId: string } | null;
  classType?: { name: string; classTypeId: string } | null;
}

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: ExtendedClassSessionWithRelations;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  onSave: (updatedLesson: UpdateClassSessionPayload) => Promise<void> | void; 
  onDelete: (lessonId: string) => void;
  booths?: Booth[];
};

function convertToEditableUI(lesson: ExtendedClassSessionWithRelations): EditableLessonUI {
  // Извлекаем время из ISOString или объекта Date
  const getTimeFromValue = (timeValue: string | Date | undefined): string => {
    if (!timeValue) return '';
    try {
      if (typeof timeValue === 'string') {
        // Если время уже в формате "HH:MM"
        if (/^\d{2}:\d{2}$/.test(timeValue)) {
          return timeValue;
        }
        
        const timeMatch = timeValue.match(/T(\d{2}:\d{2}):/);
        if (timeMatch && timeMatch[1]) {
          return timeMatch[1];
        }
        return '';
      } 
      else if (timeValue instanceof Date) {
        return `${timeValue.getUTCHours().toString().padStart(2, '0')}:${timeValue.getUTCMinutes().toString().padStart(2, '0')}`;
      }
      return '';
    } catch {
      return '';
    }
  };

  return {
    classId: lesson.classId,
    formattedStartTime: getTimeFromValue(lesson.startTime),
    formattedEndTime: getTimeFromValue(lesson.endTime),
    date: lesson.date,
    boothId: lesson.boothId,
    teacherId: lesson.teacherId,
    studentId: lesson.studentId,
    subjectId: lesson.subjectId,
    classTypeId: lesson.classTypeId,
    notes: lesson.notes,
    booth: lesson.booth,
    teacher: lesson.teacher,
    student: lesson.student,
    subject: lesson.subject,
    classType: lesson.classType
  };
}

export const LessonDialog: React.FC<LessonDialogProps> = ({
  open,
  onOpenChange,
  lesson,
  mode,
  onModeChange,
  onSave,
  onDelete,
  booths = []
}) => {
  const [editedLesson, setEditedLesson] = useState<EditableLessonUI | null>(null);
  
  const [subjects, setSubjects] = useState<{subjectId: string; name: string}[]>([]);
  const [teachers, setTeachers] = useState<{teacherId: string; name: string}[]>([]);
  const [students, setStudents] = useState<{studentId: string; name: string}[]>([]);
  const [classTypes, setClassTypes] = useState<{classTypeId: string; name: string}[]>([]);
  
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [isLoadingClassTypes, setIsLoadingClassTypes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Определяем тип урока, учитывая оба возможных свойства
  const isRegularLesson = lesson.classType?.name === '通常授業' || lesson.classTypeName === '通常授業';
  
  useEffect(() => {
    console.log('Lesson type info:', {
      classTypeName: lesson.classTypeName,
      classTypeFromObject: lesson.classType?.name,
      isRegularLesson: isRegularLesson
    });
  }, [lesson, isRegularLesson]);

  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetcher<{ data: {subjectId: string; name: string}[] }>('/api/subjects');
        setSubjects(response.data || []);
      } catch (err) {
        console.error("科目の読み込みエラー:", err);
        setError("科目の読み込みに失敗しました");
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    
    const loadTeachers = async () => {
      setIsLoadingTeachers(true);
      try {
        const response = await fetcher<{ data: {teacherId: string; name: string}[] }>('/api/teachers');
        setTeachers(response.data || []);
      } catch (err) {
        console.error("講師の読み込みエラー:", err);
        setError("講師を読み込めませんでした");
      } finally {
        setIsLoadingTeachers(false);
      }
    };
    
    const loadStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const response = await fetcher<{ data: {studentId: string; name: string}[] }>('/api/students');
        setStudents(response.data || []);
      } catch (err) {
        console.error("生徒の読み込みエラー:", err);
        setError("生徒を読み込めませんでした");
      } finally {
        setIsLoadingStudents(false);
      }
    };

    const loadClassTypes = async () => {
      setIsLoadingClassTypes(true);
      try {
        const response = await fetcher<{ data: {classTypeId: string; name: string}[] }>('/api/class-types');
        setClassTypes(response.data || []);
      } catch (err) {
        console.error("授業タイプの読み込みエラー:", err);
        setError("授業タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingClassTypes(false);
      }
    };
    
    if (open && mode === 'edit') {
      loadSubjects();
      loadTeachers();
      loadStudents();
      loadClassTypes();
    }
  }, [open, mode]);

  useEffect(() => {
    if (lesson && open) {
      setEditedLesson(convertToEditableUI(lesson));
    } else if (!open) {
      setEditedLesson(null);
      setError(null);
    }
  }, [lesson, open]);

  if (!lesson || !editedLesson) return null;

  const handleInputChange = (field: keyof EditableLessonUI, value: string | number | boolean | null | undefined) => {
    const updatedLesson: EditableLessonUI = { ...editedLesson };
    
    switch (field) {
      case 'formattedStartTime':
        updatedLesson.formattedStartTime = value as string | undefined;
        break;
      case 'formattedEndTime':
        updatedLesson.formattedEndTime = value as string | undefined;
        break;
      case 'date':
        updatedLesson.date = value as string | Date | undefined;
        break;
      case 'boothId':
        updatedLesson.boothId = value as string | null;
        break;
      case 'teacherId':
        updatedLesson.teacherId = value as string | null;
        break;
      case 'studentId':
        updatedLesson.studentId = value as string | null;
        break;
      case 'subjectId':
        updatedLesson.subjectId = value as string | null;
        break;
      case 'classTypeId':
        updatedLesson.classTypeId = value as string | null;
        break;
      case 'notes':
        updatedLesson.notes = value as string | null;
        break;
      default:
        break;
    }
    
    setEditedLesson(updatedLesson);
  };

  const handleSave = () => {
    if (!editedLesson || !editedLesson.classId) { 
        return;
    }

    const lessonToSave: UpdateClassSessionPayload = {
      classId: editedLesson.classId
    };

    // Сохраняем все поля независимо от типа урока
    if (editedLesson.subjectId !== undefined) lessonToSave.subjectId = editedLesson.subjectId || "";
    if (editedLesson.teacherId !== undefined) lessonToSave.teacherId = editedLesson.teacherId || "";
    if (editedLesson.studentId !== undefined) lessonToSave.studentId = editedLesson.studentId || "";
    if (editedLesson.classTypeId !== undefined) lessonToSave.classTypeId = editedLesson.classTypeId || "";
    if (editedLesson.boothId !== undefined) lessonToSave.boothId = editedLesson.boothId || "";
    
    if (editedLesson.notes !== undefined) {
      lessonToSave.notes = editedLesson.notes || "";
    }
    
    if (editedLesson.date) {
      lessonToSave.date = typeof editedLesson.date === 'string' 
        ? editedLesson.date 
        : formatDateToString(editedLesson.date);
    }
    
    if (editedLesson.formattedStartTime) {
      lessonToSave.startTime = editedLesson.formattedStartTime;
    }
    
    if (editedLesson.formattedEndTime) {
      lessonToSave.endTime = editedLesson.formattedEndTime;
    }

    console.log("------ ДАННЫЕ ИЗ ДИАЛОГА РЕДАКТИРОВАНИЯ -------");
    console.log(JSON.stringify(lessonToSave, null, 2));
    console.log("-------------------------------------------------");

    onSave(lessonToSave);
    onModeChange('view');
  };
  
  const isLoading = isLoadingSubjects || isLoadingTeachers || isLoadingStudents || isLoadingClassTypes;

  const getDisplayDate = (): Date => {
    if (lesson.date instanceof Date) {
      return lesson.date;
    } 
    return new Date(lesson.date as string);
  };

  const canSave = () => {
    if (isLoading) return false;
    
    // Единые правила для всех типов уроков
    return Boolean(
      editedLesson.subjectId && 
      editedLesson.teacherId && 
      editedLesson.studentId && 
      editedLesson.formattedStartTime && 
      editedLesson.formattedEndTime
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? '授業の詳細' : '授業の編集'}
            <span className={`text-sm font-normal ml-2 ${isRegularLesson ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
              ({lesson.classType?.name || lesson.classTypeName || '不明'})
            </span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' ? '授業の詳細情報です' : '授業の情報を更新してください'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">日付</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {format(getDisplayDate(), 'yyyy年MM月dd日', { locale: ja })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">教室</label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.boothId || ''}
                  onValueChange={(value) => handleInputChange('boothId', value)}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder="教室を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {booths.map(booth => (
                      <SelectItem
                        key={booth.boothId}
                        value={booth.boothId}
                        className="cursor-pointer"
                      >
                        {booth.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {booths.length > 0
                    ? (booths.find(booth => booth.boothId === lesson.boothId)?.name || `教室 ID: ${lesson.boothId}`)
                    : `教室 ID: ${lesson.boothId}`}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">科目 <span className="text-destructive">*</span></label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.subjectId || ''}
                  onValueChange={(value) => handleInputChange('subjectId', value)}
                  disabled={isLoadingSubjects || subjects.length === 0}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={
                      isLoadingSubjects 
                        ? "読み込み中..." 
                        : subjects.length === 0 
                        ? "科目がありません" 
                        : "科目を選択"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {subjects.map(subject => (
                      <SelectItem
                        key={subject.subjectId}
                        value={subject.subjectId}
                        className="cursor-pointer"
                      >
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.subject?.name || lesson.subjectName || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">授業タイプ</label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.classTypeId || ''}
                  onValueChange={(value) => handleInputChange('classTypeId', value)}
                  disabled={isLoadingClassTypes}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={isLoadingClassTypes ? "読み込み中..." : "授業タイプを選択"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {classTypes.map(type => (
                      <SelectItem
                        key={type.classTypeId}
                        value={type.classTypeId}
                        className="cursor-pointer"
                      >
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.classType?.name || lesson.classTypeName || '指定なし'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">講師 <span className="text-destructive">*</span></label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.teacherId || ''}
                  onValueChange={(value) => handleInputChange('teacherId', value)}
                  disabled={isLoadingTeachers || teachers.length === 0}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={
                      isLoadingTeachers 
                        ? "講師を読み込み中..." 
                        : teachers.length === 0 
                        ? "講師はいません" 
                        : "講師を選択"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {teachers.map(teacher => (
                      <SelectItem
                        key={teacher.teacherId}
                        value={teacher.teacherId}
                        className="cursor-pointer"
                      >
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.teacher?.name || lesson.teacherName || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">生徒 <span className="text-destructive">*</span></label>
              {mode === 'edit' ? (
                <Select
                  value={editedLesson.studentId || ''}
                  onValueChange={(value) => handleInputChange('studentId', value)}
                  disabled={isLoadingStudents || students.length === 0}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={
                      isLoadingStudents 
                        ? "生徒を読み込み中..." 
                        : students.length === 0 
                        ? "生徒はいません" 
                        : "生徒を選択"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {students.map(student => (
                      <SelectItem
                        key={student.studentId}
                        value={student.studentId}
                        className="cursor-pointer"
                      >
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.student?.name || lesson.studentName || '指定なし'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">開始時間</label>
              {mode === 'edit' ? (
                <input
                  type="time"
                  className="w-full border rounded-md p-2 mt-1 bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200 cursor-pointer border-input"
                  value={editedLesson.formattedStartTime || ''}
                  onChange={(e) => handleInputChange('formattedStartTime', e.target.value)}
                />
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {editedLesson.formattedStartTime}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">終了時間</label>
              {mode === 'edit' ? (
                <input
                  type="time"
                  className="w-full border rounded-md p-2 mt-1 bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200 cursor-pointer border-input"
                  value={editedLesson.formattedEndTime || ''}
                  onChange={(e) => handleInputChange('formattedEndTime', e.target.value)}
                />
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {editedLesson.formattedEndTime}
                </div>
              )}
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="text-sm font-medium text-foreground">メモ</label>
              <textarea
                className="w-full border rounded-md p-2 mt-1 bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200 cursor-text border-input"
                rows={3}
                value={editedLesson.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          )}
           {mode === 'view' && lesson.notes && (
             <div>
                <label className="text-sm font-medium text-foreground">メモ</label>
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground min-h-[60px] whitespace-pre-wrap border-input">
                    {lesson.notes}
                </div>
            </div>
           )}
           
          {error && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between w-full pt-4">
          {mode === 'edit' ? (
            <>
              <Button
                variant="destructive"
                className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-destructive/30 focus:outline-none"
                onClick={() => onDelete(lesson.classId)}
              >
                削除
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  onClick={() => {
                    onModeChange('view');
                    if (lesson) {
                      setEditedLesson(convertToEditableUI(lesson));
                    }
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  onClick={handleSave}
                  disabled={!canSave()}
                >
                  {isLoading ? "読み込み中..." : "保存"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div /> 
              <div className="flex space-x-2">
                 <Button
                    variant="outline"
                    className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
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