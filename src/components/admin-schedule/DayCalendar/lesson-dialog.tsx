import React, { useState, useEffect, useCallback } from 'react';
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
import { ClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { fetcher } from '@/lib/fetcher';
import { getDateString } from '../date';

interface Room {
  boothId: string;
  name: string;
}

interface EditableLessonUI {
  classId: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
  date?: string | Date;
  boothId?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  subjectTypeId?: string;
  classTypeId?: string;
  notes?: string | null;
  booth?: { name: string; boothId: string };
  teacher?: { name: string; teacherId: string };
  student?: { name: string; studentId: string };
  subject?: { name: string; subjectId: string };
  classType?: { name: string; classTypeId: string };
  regularClassTemplate?: unknown;
}

interface UpdateLessonPayload {
  classId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  boothId?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  subjectTypeId?: string;
  classTypeId?: string;
  notes?: string;
  [key: string]: unknown;
}

interface Teacher {
  teacherId: string;
  name: string;
}

interface Student {
  studentId: string;
  name: string;
}

interface Subject {
  subjectId: string;
  name: string;
}

interface SubjectType {
  subjectTypeId: string;
  name: string;
  notes?: string | null;
  subjectToSubjectTypes?: {
    subjectId: string;
    subjectTypeId: string;
    subject?: Subject;
  }[];
}

interface ClassType {
  classTypeId: string;
  name: string;
}

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: ClassSessionWithRelations;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  onSave: (updatedLesson: UpdateLessonPayload) => void; 
  onDelete: (lessonId: string) => void;
  rooms?: Room[];
};

function convertToEditableUI(lesson: ClassSessionWithRelations): EditableLessonUI {
  // Извлекаем время из ISOString или объекта Date
  const getTimeFromValue = (timeValue: string | Date | undefined): string => {
    if (!timeValue) return '';
    try {
      if (typeof timeValue === 'string') {
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
    subjectTypeId: lesson.subjectTypeId,
    classTypeId: lesson.classTypeId,
    notes: lesson.notes,
    booth: lesson.booth,
    teacher: lesson.teacher,
    student: lesson.student,
    subject: lesson.subject,
    classType: lesson.classType,
    regularClassTemplate: lesson.regularClassTemplate
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
  rooms = []
}) => {
  const [editedLesson, setEditedLesson] = useState<EditableLessonUI | null>(null);
  
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  
  const [isLoadingSubjectTypes, setIsLoadingSubjectTypes] = useState<boolean>(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [isLoadingClassTypes, setIsLoadingClassTypes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isRegularLesson = Boolean(lesson.regularClassTemplate) || 
                         (lesson.classType?.name === '通常授業');

  const loadTeachersBySubject = useCallback(async (selectedSubjectId: string) => {
    if (!selectedSubjectId) return;
    
    setIsLoadingTeachers(true);
    setTeachers([]);
    
    try {
      const response = await fetcher<{ data: Teacher[] }>(`/api/teacher?subjectId=${selectedSubjectId}`);
      setTeachers(response.data || []);
    } catch (err) {
      console.error("講師の読み込みエラー:", err);
      setError("選択した科目の講師を読み込めませんでした");
    } finally {
      setIsLoadingTeachers(false);
    }
  }, []);
  
  const loadStudentsBySubject = useCallback(async (selectedSubjectId: string) => {
    if (!selectedSubjectId) return;
    
    setIsLoadingStudents(true);
    setStudents([]);
    
    try {
      const response = await fetcher<{ data: Student[] }>(`/api/student?preferredSubjectId=${selectedSubjectId}`);
      setStudents(response.data || []);
    } catch (err) {
      console.error("生徒の読み込みエラー:", err);
      setError("選択した科目の生徒を読み込めませんでした");
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    const loadSubjectTypes = async () => {
      setIsLoadingSubjectTypes(true);
      try {
        const response = await fetcher<{ data: SubjectType[] }>('/api/subject-type');
        setSubjectTypes(response.data || []);
      } catch (err) {
        console.error("科目タイプの読み込みエラー:", err);
        setError("科目タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingSubjectTypes(false);
      }
    };
    
    if (open && !isRegularLesson && mode === 'edit') {
      loadSubjectTypes();
    }
  }, [open, isRegularLesson, mode]);

  useEffect(() => {
    const loadClassTypes = async () => {
      setIsLoadingClassTypes(true);
      try {
        const response = await fetcher<{ data: ClassType[] }>('/api/class-type');
        setClassTypes(response.data || []);
      } catch (err) {
        console.error("授業タイプの読み込みエラー:", err);
        setError("授業タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingClassTypes(false);
      }
    };
    
    if (open) {
      loadClassTypes();
    }
  }, [open]);

  useEffect(() => {
    if (lesson && open) {
      setEditedLesson(convertToEditableUI(lesson));
      
      if (!isRegularLesson && mode === 'edit' && lesson.subjectTypeId && subjectTypes.length > 0) {
        const selectedType = subjectTypes.find(type => type.subjectTypeId === lesson.subjectTypeId);
        if (selectedType && selectedType.subjectToSubjectTypes) {
          const filteredSubjects = selectedType.subjectToSubjectTypes
            .filter(item => item.subject)
            .map(item => ({
              subjectId: item.subjectId,
              name: item.subject?.name || '不明な科目'
            }));
          
          setSubjects(filteredSubjects);
          
          if (lesson.subjectId) {
            loadTeachersBySubject(lesson.subjectId);
            loadStudentsBySubject(lesson.subjectId);
          }
        }
      }
    } else if (!open) {
      setEditedLesson(null);
      setSubjects([]);
      setTeachers([]);
      setStudents([]);
      setError(null);
    }
  }, [lesson, open, isRegularLesson, mode, subjectTypes, loadTeachersBySubject, loadStudentsBySubject]);

  useEffect(() => {
    if (!editedLesson) return;
    
    if (editedLesson.subjectTypeId && !isRegularLesson && mode === 'edit') {
      const selectedType = subjectTypes.find(type => type.subjectTypeId === editedLesson.subjectTypeId);
      if (selectedType && selectedType.subjectToSubjectTypes) {
        const filteredSubjects = selectedType.subjectToSubjectTypes
          .filter(item => item.subject)
          .map(item => ({
            subjectId: item.subjectId,
            name: item.subject?.name || '不明な科目'
          }));
        
        setSubjects(filteredSubjects);
        
        if (editedLesson.subjectId && !filteredSubjects.some(s => s.subjectId === editedLesson.subjectId)) {
          const updatedLesson: EditableLessonUI = { 
            ...editedLesson,
            subjectId: undefined,
            teacherId: undefined,
            studentId: undefined
          };
          setEditedLesson(updatedLesson);
          
          setTeachers([]);
          setStudents([]);
        }
      }
    }
  }, [editedLesson, editedLesson?.subjectTypeId, subjectTypes, isRegularLesson, mode]);

  useEffect(() => {
    if (editedLesson?.subjectId && !isRegularLesson && mode === 'edit') {
      loadTeachersBySubject(editedLesson.subjectId);
      loadStudentsBySubject(editedLesson.subjectId);
    }
  }, [editedLesson?.subjectId, isRegularLesson, mode, loadTeachersBySubject, loadStudentsBySubject]);

  if (!lesson || !editedLesson) return null;

  const handleInputChange = (field: keyof EditableLessonUI, value: string | number | boolean | null | undefined) => {
    const updatedLesson: EditableLessonUI = { ...editedLesson };
    
    if (field === 'subjectTypeId' && editedLesson.subjectTypeId !== value) {
      if (field === 'subjectTypeId') {
        updatedLesson.subjectTypeId = value as string | undefined;
      }
      updatedLesson.subjectId = undefined;
      updatedLesson.teacherId = undefined;
      updatedLesson.studentId = undefined;
      setEditedLesson(updatedLesson);
      return;
    }
    
    if (field === 'subjectId' && editedLesson.subjectId !== value) {
      if (field === 'subjectId') {
        updatedLesson.subjectId = value as string | undefined;
      }
      updatedLesson.teacherId = undefined;
      updatedLesson.studentId = undefined;
      setEditedLesson(updatedLesson);
      return;
    }
    
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
        updatedLesson.boothId = value as string | undefined;
        break;
      case 'teacherId':
        updatedLesson.teacherId = value as string | undefined;
        break;
      case 'studentId':
        updatedLesson.studentId = value as string | undefined;
        break;
      case 'subjectTypeId':
        updatedLesson.subjectTypeId = value as string | undefined;
        break;
      case 'classTypeId':
        updatedLesson.classTypeId = value as string | undefined;
        break;
      case 'notes':
        updatedLesson.notes = value as string | null | undefined;
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

    const lessonToSave: UpdateLessonPayload = {
      classId: editedLesson.classId
    };

    // Для обычных уроков (通常授業) позволяем менять только время, кабинет и заметки
    if (isRegularLesson) {
      if (editedLesson.formattedStartTime) {
        lessonToSave.startTime = editedLesson.formattedStartTime;
      }
      
      if (editedLesson.formattedEndTime) {
        lessonToSave.endTime = editedLesson.formattedEndTime;
      }
      
      if (editedLesson.boothId) {
        lessonToSave.boothId = editedLesson.boothId;
      }

      if (editedLesson.notes !== undefined) {
        lessonToSave.notes = editedLesson.notes || "";
      }
    } else {
      if (editedLesson.subjectId) lessonToSave.subjectId = editedLesson.subjectId;
      if (editedLesson.subjectTypeId) lessonToSave.subjectTypeId = editedLesson.subjectTypeId;
      if (editedLesson.teacherId) lessonToSave.teacherId = editedLesson.teacherId;
      if (editedLesson.studentId) lessonToSave.studentId = editedLesson.studentId;
      if (editedLesson.classTypeId) lessonToSave.classTypeId = editedLesson.classTypeId;
      if (editedLesson.boothId) lessonToSave.boothId = editedLesson.boothId;
      
      lessonToSave.notes = editedLesson.notes || "";
      
      if (editedLesson.date) {
        if (editedLesson.date instanceof Date) {
          lessonToSave.date = getDateString(editedLesson.date);
        } else {
          lessonToSave.date = editedLesson.date;
        }
      }
      if (editedLesson.formattedStartTime) {
        lessonToSave.startTime = editedLesson.formattedStartTime;
      }
      if (editedLesson.formattedEndTime) {
        lessonToSave.endTime = editedLesson.formattedEndTime;
      }
    }
    onSave(lessonToSave);
    onModeChange('view');
  };
  
  const isLoading = isLoadingSubjectTypes || isLoadingTeachers || isLoadingStudents || isLoadingClassTypes;

  const getDisplayDate = (): Date => {
    if (lesson.date instanceof Date) {
      return lesson.date;
    } 
    return new Date(lesson.date as string);
  };

  const canSave = () => {
    if (isLoading) return false;
    
    if (isRegularLesson) {
      return Boolean(editedLesson.formattedStartTime && editedLesson.formattedEndTime);
    } else {
      return Boolean(
        editedLesson.subjectTypeId && 
        editedLesson.subjectId && 
        editedLesson.teacherId && 
        editedLesson.studentId && 
        editedLesson.formattedStartTime && 
        editedLesson.formattedEndTime
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? '授業の詳細' : '授業の編集'}
            {isRegularLesson && <span className="text-sm font-normal ml-2 text-blue-500 dark:text-blue-400">(通常授業)</span>}
            {!isRegularLesson && <span className="text-sm font-normal ml-2 text-red-500 dark:text-red-400">(特別補習)</span>}
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
                    {rooms.map(room => (
                      <SelectItem
                        key={room.boothId}
                        value={room.boothId}
                        className="cursor-pointer"
                      >
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {rooms.length > 0
                    ? (rooms.find(room => room.boothId === lesson.boothId)?.name || `教室 ID: ${lesson.boothId}`)
                    : `教室 ID: ${lesson.boothId}`}
                </div>
              )}
            </div>
          </div>

          {mode === 'edit' && !isRegularLesson && (
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">科目タイプ <span className="text-destructive">*</span></label>
              <Select
                value={editedLesson.subjectTypeId || ''}
                onValueChange={(value) => handleInputChange('subjectTypeId', value)}
                disabled={isLoadingSubjectTypes}
              >
                <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                  <SelectValue placeholder={isLoadingSubjectTypes ? "科目タイプを読み込み中..." : "科目タイプを選択"} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {subjectTypes.map(type => (
                    <SelectItem
                      key={type.subjectTypeId}
                      value={type.subjectTypeId}
                      className="cursor-pointer"
                    >
                      {type.name} {type.notes && <span className="text-muted-foreground text-xs ml-1">({type.notes})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">科目 <span className="text-destructive">*</span></label>
              {mode === 'edit' && !isRegularLesson ? (
                <Select
                  value={editedLesson.subjectId || ''}
                  onValueChange={(value) => handleInputChange('subjectId', value)}
                  disabled={isLoadingSubjectTypes || !editedLesson.subjectTypeId || subjects.length === 0}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={
                      isLoadingSubjectTypes 
                        ? "読み込み中..." 
                        : !editedLesson.subjectTypeId 
                        ? "先に科目タイプを選択してください" 
                        : subjects.length === 0 
                        ? "この科目タイプの科目はありません" 
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
                  {lesson.subject?.name || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">授業タイプ</label>
              {mode === 'edit' && !isRegularLesson ? (
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
                  {lesson.classType?.name || '指定なし'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">講師 <span className="text-destructive">*</span></label>
              {mode === 'edit' && !isRegularLesson ? (
                <Select
                  value={editedLesson.teacherId || ''}
                  onValueChange={(value) => handleInputChange('teacherId', value)}
                  disabled={isLoadingTeachers || !editedLesson.subjectId || teachers.length === 0}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={
                      isLoadingTeachers 
                        ? "講師を読み込み中..." 
                        : !editedLesson.subjectId 
                        ? "先に科目を選択してください" 
                        : teachers.length === 0 
                        ? "この科目の講師はいません" 
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
                  {lesson.teacher?.name || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">生徒 <span className="text-destructive">*</span></label>
              {mode === 'edit' && !isRegularLesson ? (
                <Select
                  value={editedLesson.studentId || ''}
                  onValueChange={(value) => handleInputChange('studentId', value)}
                  disabled={isLoadingStudents || !editedLesson.subjectId || students.length === 0}
                >
                  <SelectTrigger className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                    <SelectValue placeholder={
                      isLoadingStudents 
                        ? "生徒を読み込み中..." 
                        : !editedLesson.subjectId 
                        ? "先に科目を選択してください" 
                        : students.length === 0 
                        ? "この科目の生徒はいません" 
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
                  {lesson.student?.name || '指定なし'}
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