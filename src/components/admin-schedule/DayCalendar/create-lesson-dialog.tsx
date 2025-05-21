import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from '@/lib/fetcher';
import {
  CreateClassSessionPayload,
  NewClassSessionData,
  formatDateToString
} from './types/class-session';

function DateRangePicker({ 
  dateRange, 
  setDateRange, 
  placeholder = "期間を選択" 
}: {
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);
  
  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTempRange(dateRange);
    }
  };
  
  const handleApply = () => {
    setDateRange(tempRange);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "yyyy年MM月dd日", { locale: ja })} - {format(dateRange.to, "yyyy年MM月dd日", { locale: ja })}
              </>
            ) : (
              format(dateRange.from, "yyyy年MM月dd日", { locale: ja })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        style={{ 
          zIndex: 9999,
          position: 'relative', 
          pointerEvents: 'auto' 
        }} 
        align="start" 
        side="bottom" 
        sideOffset={8}
        forceMount
      >
        <div className="flex flex-col">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            locale={ja}
            showOutsideDays={false}
            className="rounded-md border-b pointer-events-auto"
          />
          <div className="flex justify-end p-2 bg-background border-t">
            <div className="text-sm mr-auto text-muted-foreground">
              {tempRange?.from && tempRange?.to && (
                <>
                  {format(tempRange.from, "yyyy年MM月dd日", { locale: ja })} - {format(tempRange.to, "yyyy年MM月dd日", { locale: ja })}
                </>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={handleApply}
              disabled={!tempRange?.from || !tempRange?.to}
            >
              適用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Booth {
  boothId: string;
  name: string;
}

type CreateLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonData: NewClassSessionData;
  onSave: (data: CreateClassSessionPayload) => Promise<void> | void;
  booths: Booth[];
};

interface Teacher {
  teacherId: string;
  name: string;
}

interface Student {
  studentId: string;
  name: string;
  studentTypeId?: string;
}

interface Subject {
  subjectId: string;
  name: string;
}

interface ClassType {
  classTypeId: string;
  name: string;
}

interface StudentType {
  studentTypeId: string;
  name: string;
  maxYears?: number;
  description?: string;
}

export const CreateLessonDialog: React.FC<CreateLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonData,
  onSave,
  booths
}) => {
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [studentTypeId, setStudentTypeId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  
  const [isLoadingStudentTypes, setIsLoadingStudentTypes] = useState<boolean>(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(false);
  const [isLoadingClassTypes, setIsLoadingClassTypes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [regularClassTypeId, setRegularClassTypeId] = useState<string>('');

  useEffect(() => {
    const loadClassTypes = async () => {
      setIsLoadingClassTypes(true);
      try {
        const response = await fetcher<{ data: ClassType[] }>('/api/class-types');
        setClassTypes(response.data || []);
        
        const regularType = response.data.find(type => type.name === '通常授業');
        
        if (regularType) {
          setRegularClassTypeId(regularType.classTypeId);
          setSelectedClassTypeId(regularType.classTypeId);
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
    const loadStudentTypes = async () => {
      setIsLoadingStudentTypes(true);
      try {
        const response = await fetcher<{ data: StudentType[] }>('/api/student-types');
        setStudentTypes(response.data || []);
      } catch (err) {
        console.error("生徒タイプの読み込みエラー:", err);
        setError("生徒タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingStudentTypes(false);
      }
    };
    
    if (open) {
      loadStudentTypes();
    }
  }, [open]);

  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetcher<{ data: Subject[] }>('/api/subjects');
        setSubjects(response.data || []);
      } catch (err) {
        console.error("科目の読み込みエラー:", err);
        setError("科目の読み込みに失敗しました");
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    
    if (open && studentId) {
      loadSubjects();
    }
  }, [open, studentId]);

  useEffect(() => {
    if (open) {
      setIsRecurring(false);
      setStudentTypeId('');
      setStudentId('');
      setSubjectId('');
      setTeacherId('');
      setNotes('');
      const lessonDate = typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date;
      setDateRange({ from: lessonDate, to: undefined });
      setSelectedDays([]);
      setError(null);
    }
  }, [open, lessonData.date]);

  const loadStudentsByType = useCallback(async (selectedStudentTypeId: string) => {
    if (!selectedStudentTypeId) return;
    
    setIsLoadingStudents(true);
    setStudents([]);
    setStudentId('');
    
    try {
      const url = selectedStudentTypeId 
        ? `/api/students?studentTypeId=${selectedStudentTypeId}` 
        : '/api/students';
      
      const response = await fetcher<{ data: Student[] }>(url);
      setStudents(response.data || []);
    } catch (err) {
      console.error("生徒の読み込みエラー:", err);
      setError("生徒を読み込めませんでした");
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);
  
  const loadTeachers = useCallback(async () => {
    setIsLoadingTeachers(true);
    setTeachers([]);
    setTeacherId('');
    
    try {
      const response = await fetcher<{ data: Teacher[] }>('/api/teachers');
      setTeachers(response.data || []);
    } catch (err) {
      console.error("講師の読み込みエラー:", err);
      setError("講師を読み込めませんでした");
    } finally {
      setIsLoadingTeachers(false);
    }
  }, []);
  
  useEffect(() => {
    if (studentTypeId) {
      loadStudentsByType(studentTypeId);
    } else {
      setStudents([]);
      setStudentId('');
    }
  }, [studentTypeId, loadStudentsByType]);
  
  useEffect(() => {
    if (studentId) {
      if (!subjects.length) {
        const loadSubjects = async () => {
          setIsLoadingSubjects(true);
          try {
            const response = await fetcher<{ data: Subject[] }>('/api/subjects');
            setSubjects(response.data || []);
          } catch (err) {
            console.error("科目の読み込みエラー:", err);
            setError("科目の読み込みに失敗しました");
          } finally {
            setIsLoadingSubjects(false);
          }
        };
        
        loadSubjects();
      }
      
      if (!teachers.length) {
        loadTeachers();
      }
    }
  }, [studentId, subjects.length, teachers.length, loadTeachers]);

  useEffect(() => {
    setIsRecurring(selectedClassTypeId === regularClassTypeId);
  }, [selectedClassTypeId, regularClassTypeId]);

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSubmit = () => {
    if (!studentId || !subjectId || !teacherId || !selectedClassTypeId || !dateRange?.from) {
      return;
    }
    
    const payload: CreateClassSessionPayload = {
      date: formatDateToString(lessonData.date),
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
      boothId: lessonData.boothId,
      subjectId: subjectId,
      teacherId: teacherId,
      studentId: studentId,
      notes: notes || "",
      classTypeId: selectedClassTypeId
    };
    
    if (isRecurring) {
      payload.isRecurring = true;
      payload.startDate = format(dateRange.from, 'yyyy-MM-dd');
      
      if (dateRange.to) {
        payload.endDate = format(dateRange.to, 'yyyy-MM-dd');
      }
      
      if (selectedDays.length > 0) {
        payload.daysOfWeek = selectedDays;
      } else {
        const dayOfWeek = dateRange.from.getDay();
        payload.daysOfWeek = [dayOfWeek];
      }
    }

    console.log("------ ДАННЫЕ ИЗ ДИАЛОГА -------");
    console.log(JSON.stringify(payload, null, 2));
    console.log("--------------------------------------------");

    onSave(payload);
    onOpenChange(false); 
  };

  const isLoading = isLoadingStudentTypes || isLoadingStudents || isLoadingSubjects || isLoadingTeachers || isLoadingClassTypes;

  const daysOfWeek = [
    { label: '月', value: 1 },
    { label: '火', value: 2 },
    { label: '水', value: 3 },
    { label: '木', value: 4 },
    { label: '金', value: 5 },
    { label: '土', value: 6 },
    { label: '日', value: 0 }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>授業の作成</DialogTitle>
          <DialogDescription>
            新しい授業の情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">日付</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {format(typeof lessonData.date === 'string' ? new Date(lessonData.date) : lessonData.date, 'yyyy年MM月dd日', { locale: ja })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">教室</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {booths.find(booth => booth.boothId === lessonData.boothId)?.name || lessonData.boothId}
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
            <label htmlFor="class-type-select" className="text-sm font-medium mb-1 block text-foreground">授業のタイプ <span className="text-destructive">*</span></label>
            <Select 
              value={selectedClassTypeId} 
              onValueChange={setSelectedClassTypeId} 
              disabled={isLoadingClassTypes || classTypes.length === 0}
            >
              <SelectTrigger id="class-type-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  isLoadingClassTypes 
                    ? "授業タイプを読み込み中..." 
                    : classTypes.length === 0 
                    ? "授業タイプがありません" 
                    : "授業タイプを選択"
                } />
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
          </div>
          
          {isRecurring && (
            <div className="space-y-4 p-3 rounded-md border border-input bg-muted/30">
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">期間 <span className="text-destructive">*</span></label>
                <div className="relative">
                  <DateRangePicker
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    placeholder="期間を選択"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">曜日を選択</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm
                        transition-colors duration-200 
                        ${selectedDays.includes(day.value) 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground border border-input'
                        }
                      `}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {selectedDays.length === 0 
                    ? "曜日が選択されていない場合、選択した日付の曜日が使用されます。" 
                    : `選択された曜日: ${selectedDays.map(d => daysOfWeek.find(day => day.value === d)?.label).join(', ')}`
                  }
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="student-type-select" className="text-sm font-medium mb-1 block text-foreground">生徒タイプ <span className="text-destructive">*</span></label>
            <Select value={studentTypeId} onValueChange={setStudentTypeId} disabled={isLoadingStudentTypes}>
              <SelectTrigger id="student-type-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={isLoadingStudentTypes ? "生徒タイプを読み込み中..." : "生徒タイプを選択"} />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {studentTypes.map(type => (
                  <SelectItem
                    key={type.studentTypeId}
                    value={type.studentTypeId}
                    className="cursor-pointer"
                  >
                    {type.name} {type.description && <span className="text-muted-foreground text-xs ml-1">({type.description})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="student-select" className="text-sm font-medium mb-1 block text-foreground">生徒 <span className="text-destructive">*</span></label>
            <Select value={studentId} onValueChange={setStudentId} disabled={isLoadingStudents || !studentTypeId || students.length === 0}>
              <SelectTrigger id="student-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  isLoadingStudents 
                    ? "生徒を読み込み中..." 
                    : !studentTypeId 
                    ? "先に生徒タイプを選択してください" 
                    : students.length === 0 
                    ? "この生徒タイプの生徒はいません" 
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
            <label htmlFor="subject-select" className="text-sm font-medium mb-1 block text-foreground">科目 <span className="text-destructive">*</span></label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={isLoadingSubjects || !studentId || subjects.length === 0}>
              <SelectTrigger id="subject-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  isLoadingSubjects 
                    ? "科目を読み込み中..." 
                    : !studentId 
                    ? "先に生徒を選択してください" 
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
          </div>

          <div>
            <label htmlFor="teacher-select" className="text-sm font-medium mb-1 block text-foreground">講師 <span className="text-destructive">*</span></label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={isLoadingTeachers || !studentId || teachers.length === 0}>
              <SelectTrigger id="teacher-select" className="w-full transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer active:scale-[0.98]">
                <SelectValue placeholder={
                  isLoadingTeachers 
                    ? "講師を読み込み中..." 
                    : !studentId 
                    ? "先に生徒を選択してください" 
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
            disabled={isLoading || !studentTypeId || !studentId || !subjectId || !teacherId || !selectedClassTypeId}
          >
            {isLoading ? "読み込み中..." : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};