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
import { NewLessonData } from './admin-calendar-day';
import { fetcher } from '@/lib/fetcher';

interface Room {
  boothId: string;
  name: string;
}

interface CreateLessonDialogPayload extends NewLessonData {
  subjectId: string;
  subjectTypeId: string;
  teacherId: string;
  studentId: string;
  notes?: string | null;
  classTypeId: string;
}

type CreateLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonData: NewLessonData;
  onSave: (data: CreateLessonDialogPayload) => void;
  rooms: Room[];
};

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

export const CreateLessonDialog: React.FC<CreateLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonData,
  onSave,
  rooms
}) => {
  const [subjectTypeId, setSubjectTypeId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [specialLessonTypeId, setSpecialLessonTypeId] = useState<string>('');
  
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
    
    if (open) {
      loadSubjectTypes();
    }
  }, [open]);

  useEffect(() => {
    const loadClassTypes = async () => {
      setIsLoadingClassTypes(true);
      try {
        const response = await fetcher<{ data: ClassType[] }>('/api/class-type');
        setClassTypes(response.data || []);
        
        const specialLessonType = response.data.find(type => type.name === '特別補習');
        if (specialLessonType) {
          setSpecialLessonTypeId(specialLessonType.classTypeId);
        }
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
    if (open) {
      setSubjectTypeId('');
      setSubjectId('');
      setTeacherId('');
      setStudentId('');
      setNotes('');
      setSubjects([]);
      setTeachers([]);
      setStudents([]);
      setError(null);
    }
  }, [open]);
  
  useEffect(() => {
    if (subjectTypeId) {
      const selectedType = subjectTypes.find(type => type.subjectTypeId === subjectTypeId);
      if (selectedType && selectedType.subjectToSubjectTypes) {
        const filteredSubjects = selectedType.subjectToSubjectTypes
          .filter(item => item.subject)
          .map(item => ({
            subjectId: item.subjectId,
            name: item.subject?.name || '不明な科目'
          }));
        
        setSubjects(filteredSubjects);
        setSubjectId('');
        setTeacherId('');
        setStudentId('');
      }
    } else {
      setSubjects([]);
    }
  }, [subjectTypeId, subjectTypes]);
  
  const loadTeachersBySubject = useCallback(async (selectedSubjectId: string) => {
    if (!selectedSubjectId) return;
    
    setIsLoadingTeachers(true);
    setTeachers([]);
    setTeacherId('');
    
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
    setStudentId('');
    
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
    if (subjectId) {
      loadTeachersBySubject(subjectId);
      loadStudentsBySubject(subjectId);
    } else {
      setTeachers([]);
      setStudents([]);
      setTeacherId('');
      setStudentId('');
    }
  }, [subjectId, loadTeachersBySubject, loadStudentsBySubject]);

  const handleSubmit = () => {
    if (!subjectTypeId || !subjectId || !teacherId || !studentId || !specialLessonTypeId) {
      return;
    }
    
    onSave({
      date: lessonData.date,
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
      roomId: lessonData.roomId,
      subjectId: subjectId,
      subjectTypeId: subjectTypeId,
      teacherId: teacherId,
      studentId: studentId,
      notes: notes || "",
      classTypeId: specialLessonTypeId
    });

    onOpenChange(false); 
  };

  const isLoading = isLoadingSubjectTypes || isLoadingTeachers || isLoadingStudents || isLoadingClassTypes;
  const specialLessonType = classTypes.find(type => type.classTypeId === specialLessonTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>特別補習の作成</DialogTitle>
          <DialogDescription>
            新しい特別補習の情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">日付</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {format(lessonData.date, 'yyyy年MM月dd日', { locale: ja })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">教室</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {rooms.find(room => room.boothId === lessonData.roomId)?.name || lessonData.roomId}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">開始時間</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {lessonData.startTime}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">終了時間</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {lessonData.endTime}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block text-foreground">授業タイプ</label>
            <div className="border rounded-md p-2 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary flex items-center border-input">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {specialLessonType ? specialLessonType.name : '特別補習'}
              <span className="text-xs ml-2 text-primary/80 dark:text-primary/80">(このタイプは変更できません)</span>
            </div>
          </div>

          <div>
            <label htmlFor="subject-type-select" className="text-sm font-medium mb-1 block text-foreground">科目タイプ <span className="text-destructive">*</span></label>
            <Select value={subjectTypeId} onValueChange={setSubjectTypeId} disabled={isLoadingSubjectTypes}>
              <SelectTrigger id="subject-type-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
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

          <div>
            <label htmlFor="subject-select" className="text-sm font-medium mb-1 block text-foreground">科目 <span className="text-destructive">*</span></label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!subjectTypeId || subjects.length === 0}>
              <SelectTrigger id="subject-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  !subjectTypeId 
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
          </div>

          <div>
            <label htmlFor="teacher-select" className="text-sm font-medium mb-1 block text-foreground">講師 <span className="text-destructive">*</span></label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={isLoadingTeachers || !subjectId}>
              <SelectTrigger id="teacher-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  isLoadingTeachers 
                    ? "講師を読み込み中..." 
                    : !subjectId 
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
          </div>

          <div>
            <label htmlFor="student-select" className="text-sm font-medium mb-1 block text-foreground">生徒 <span className="text-destructive">*</span></label>
            <Select value={studentId} onValueChange={setStudentId} disabled={isLoadingStudents || !subjectId}>
              <SelectTrigger id="student-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  isLoadingStudents 
                    ? "生徒を読み込み中..." 
                    : !subjectId 
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
          </div>
          
          <div>
            <label htmlFor="notes" className="text-sm font-medium mb-1 block text-foreground">メモ</label>
            <textarea
              id="notes"
              className="w-full min-h-[80px] p-2 border rounded-md bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors border-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="授業に関するメモを入力してください"
            />
          </div>
          
          {error && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
            onClick={handleSubmit}
            disabled={isLoading || !subjectTypeId || !subjectId || !teacherId || !studentId || !specialLessonTypeId}
          >
            {isLoading ? "読み込み中..." : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};