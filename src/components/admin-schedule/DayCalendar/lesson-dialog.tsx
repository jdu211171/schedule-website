// LessonDialog.tsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { useClassSessionDelete, useClassSessionUpdate } from '@/hooks/useClassSessionMutation';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { TimeInput } from '@/components/ui/time-input';

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
  const [error, setError] = useState<string | null>(null);
  
  const deleteClassMutation = useClassSessionDelete();
  const updateClassMutation = useClassSessionUpdate();

  const isRecurringLesson = lesson.seriesId !== null;

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
      case 'boothId':
        updatedLesson.boothId = value as string | null;
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
      startTime?: string;
      endTime?: string;
      boothId?: string;
      notes?: string | null;
    } = {
      classId: editedLesson.classId
    };
    
    if (editedLesson.formattedStartTime) {
      lessonToSave.startTime = editedLesson.formattedStartTime;
    }
    
    if (editedLesson.formattedEndTime) {
      lessonToSave.endTime = editedLesson.formattedEndTime;
    }

    if (editedLesson.boothId !== undefined) {
      lessonToSave.boothId = editedLesson.boothId || "";
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

  const getDisplayDate = (): Date => {
    if (lesson.date instanceof Date) {
      return lesson.date;
    } 
    return new Date(lesson.date as string);
  };

  const canSave = () => {
    return Boolean(
      editedLesson.formattedStartTime && 
      editedLesson.formattedEndTime &&
      editedLesson.boothId
    );
  };

  const boothItems: SearchableSelectItem[] = booths.map((booth) => ({
    value: booth.boothId,
    label: booth.name,
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
            {mode === 'view' ? '授業の詳細情報です' : '時間と教室を変更できます'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date (non-editable) and Booth (editable) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">日付</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {format(getDisplayDate(), 'yyyy年MM月dd日', { locale: ja })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">教室 {mode === 'edit' && <span className="text-destructive">*</span>}</label>
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

          {/* Start time (editable) and End time (editable) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">開始時間 {mode === 'edit' && <span className="text-destructive">*</span>}</label>
              {mode === 'edit' ? (
                <div className="mt-1">
                  <TimeInput
                    value={editedLesson.formattedStartTime || ''}
                    onChange={(value) => handleInputChange('formattedStartTime', value)}
                    placeholder="開始時間を選択"
                  />
                </div>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {editedLesson.formattedStartTime}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">終了時間 {mode === 'edit' && <span className="text-destructive">*</span>}</label>
              {mode === 'edit' ? (
                <div className="mt-1">
                  <TimeInput
                    value={editedLesson.formattedEndTime || ''}
                    onChange={(value) => handleInputChange('formattedEndTime', value)}
                    placeholder="終了時間を選択"
                  />
                </div>
              ) : (
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {editedLesson.formattedEndTime}
                </div>
              )}
            </div>
          </div>

          {/* Subject (non-editable) and Class Type (non-editable) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">科目</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {lesson.subject?.name || lesson.subjectName || '指定なし'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">授業タイプ</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {lesson.classType?.name || lesson.classTypeName || '指定なし'}
              </div>
            </div>
          </div>

          {/* Teacher (non-editable) and Student (non-editable) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">講師</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {lesson.teacher?.name || lesson.teacherName || '指定なし'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">生徒</label>
              <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                {lesson.student?.name || lesson.studentName || '指定なし'}
              </div>
            </div>
          </div>

          {/* Notes - editable in edit mode, shown only if exists in view mode */}
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
                  {updateClassMutation.isPending ? "保存中..." : "保存"}
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