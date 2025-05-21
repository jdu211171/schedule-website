// LessonDialog.tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { useClassSessionDelete, useClassSessionUpdate } from '@/hooks/useClassSessionMutation';
import { fetcher } from '@/lib/fetcher';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';

// ...остальной код остается без изменений

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
  onSave: (lessonId: string) => void;
  onDelete: (lessonId: string) => void;
  booths?: Booth[];
};

function convertToEditableUI(lesson: ExtendedClassSessionWithRelations): EditableLessonUI {
  const getTimeFromValue = (timeValue: string | Date | undefined): string => {
    if (!timeValue) return '';
    try {
      if (typeof timeValue === 'string') {
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
  
  const deleteClassMutation = useClassSessionDelete();
  const updateClassMutation = useClassSessionUpdate();

  const isRecurringLesson = lesson.seriesId !== null;
  
  // Загрузка данных (useEffect блоки - без изменений)
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

  // Обработчики (без изменений)
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

    const lessonToSave: {
      classId: string;
      teacherId?: string;
      subjectId?: string;
      startTime?: string;
      endTime?: string;
      notes?: string | null;
    } = {
      classId: editedLesson.classId
    };

    if (editedLesson.teacherId !== undefined) {
      lessonToSave.teacherId = editedLesson.teacherId || "";
    }
    
    if (editedLesson.formattedStartTime) {
      lessonToSave.startTime = editedLesson.formattedStartTime;
    }
    
    if (editedLesson.formattedEndTime) {
      lessonToSave.endTime = editedLesson.formattedEndTime;
    }
    
    if (editedLesson.notes !== undefined) {
      lessonToSave.notes = editedLesson.notes || "";
    }

    updateClassMutation.mutate(lessonToSave, {
      onSuccess: () => {
        onSave(lessonToSave.classId);
        onModeChange('view');
      },
      onError: (error) => {
        console.error("授業の更新エラー:", error);
        setError("授業の更新に失敗しました");
      }
    });
  };

  const handleDelete = () => {
    if (!lesson.classId) return;
    
    if (!window.confirm('本当にこの授業を削除しますか？')) {
      return;
    }
    
    deleteClassMutation.mutate(lesson.classId, {
      onSuccess: () => {
        onDelete(lesson.classId);
      },
      onError: (error) => {
        console.error("授業の削除エラー:", error);
        setError("授業の削除に失敗しました");
      }
    });
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
    
    return Boolean(
      editedLesson.teacherId && 
      editedLesson.formattedStartTime && 
      editedLesson.formattedEndTime
    );
  };

  // Преобразуем данные для SearchableSelect
  const boothItems: SearchableSelectItem[] = booths.map((booth) => ({
    value: booth.boothId,
    label: booth.name,
  }));

  const subjectItems: SearchableSelectItem[] = subjects.map((subject) => ({
    value: subject.subjectId,
    label: subject.name,
  }));

  const teacherItems: SearchableSelectItem[] = teachers.map((teacher) => ({
    value: teacher.teacherId,
    label: teacher.name,
  }));

  const studentItems: SearchableSelectItem[] = students.map((student) => ({
    value: student.studentId,
    label: student.name,
  }));

  const classTypeItems: SearchableSelectItem[] = classTypes.map((type) => ({
    value: type.classTypeId,
    label: type.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' ? '授業の詳細' : '授業の編集'}
            <span className={`text-sm font-normal ml-2 ${isRecurringLesson ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
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
                <SearchableSelect
                  value={editedLesson.boothId || ''}
                  onValueChange={(value) => handleInputChange('boothId', value)}
                  items={boothItems}
                  placeholder="教室を選択"
                  searchPlaceholder="教室を検索..."
                  emptyMessage="教室が見つかりません"
                />
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
                <SearchableSelect
                  value={editedLesson.subjectId || ''}
                  onValueChange={(value) => handleInputChange('subjectId', value)}
                  items={subjectItems}
                  placeholder="科目を選択"
                  searchPlaceholder="科目を検索..."
                  emptyMessage="科目が見つかりません"
                  loading={isLoadingSubjects}
                  disabled={isLoadingSubjects || subjects.length === 0}
                />
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.subject?.name || lesson.subjectName || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">授業タイプ</label>
              {mode === 'edit' ? (
                <SearchableSelect
                  value={editedLesson.classTypeId || ''}
                  onValueChange={(value) => handleInputChange('classTypeId', value)}
                  items={classTypeItems}
                  placeholder="授業タイプを選択"
                  searchPlaceholder="授業タイプを検索..."
                  emptyMessage="授業タイプが見つかりません"
                  loading={isLoadingClassTypes}
                  disabled={isLoadingClassTypes}
                />
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
                <SearchableSelect
                  value={editedLesson.teacherId || ''}
                  onValueChange={(value) => handleInputChange('teacherId', value)}
                  items={teacherItems}
                  placeholder="講師を選択"
                  searchPlaceholder="講師を検索..."
                  emptyMessage="講師が見つかりません"
                  loading={isLoadingTeachers}
                  disabled={isLoadingTeachers || teachers.length === 0}
                />
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.teacher?.name || lesson.teacherName || '指定なし'}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">生徒 <span className="text-destructive">*</span></label>
              {mode === 'edit' ? (
                <SearchableSelect
                  value={editedLesson.studentId || ''}
                  onValueChange={(value) => handleInputChange('studentId', value)}
                  items={studentItems}
                  placeholder="生徒を選択"
                  searchPlaceholder="生徒を検索..."
                  emptyMessage="生徒が見つかりません"
                  loading={isLoadingStudents}
                  disabled={isLoadingStudents || students.length === 0}
                />
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
                onClick={handleDelete}
                disabled={deleteClassMutation.isPending}
              >
                {deleteClassMutation.isPending ? "削除中..." : "削除"}
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
                  disabled={!canSave() || updateClassMutation.isPending}
                >
                  {isLoading || updateClassMutation.isPending ? "読み込み中..." : "保存"}
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