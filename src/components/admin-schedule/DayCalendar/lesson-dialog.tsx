import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { useClassSessionDelete, useClassSessionUpdate, useClassSessionSeriesUpdate, useClassSessionSeriesDelete } from '@/hooks/useClassSessionMutation';
import { SearchableSelect, SearchableSelectItem } from '../searchable-select';
import { TimeInput } from '@/components/ui/time-input';
import { ConfirmDeleteDialog } from '../confirm-delete-dialog';
import { useAvailability } from './availability-layer';

interface Booth {
  boothId: string;
  name: string;
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

type EditMode = 'single' | 'series';
type DeleteMode = 'single' | 'series';

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: ExtendedClassSessionWithRelations;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
  onSave: (lessonId: string, wasSeriesEdit?: boolean) => void;
  onDelete: (lessonId: string) => void;
  booths?: Booth[];
  teachers?: Teacher[];
  students?: Student[];
  subjects?: Subject[];
};

const DEFAULT_TIME_SLOTS = Array.from({ length: 57 }, (_, i) => {
  const hours = Math.floor(i / 4) + 8;
  const startMinutes = (i % 4) * 15;
  let endHours, endMinutes;

  if (startMinutes === 45) {
    endHours = hours + 1;
    endMinutes = 0;
  } else {
    endHours = hours;
    endMinutes = startMinutes + 15;
  }

  return {
    index: i,
    start: `${hours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
    end: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
    display: `${hours}:${startMinutes === 0 ? '00' : startMinutes} - ${endHours}:${endMinutes === 0 ? '00' : endMinutes}`,
    shortDisplay: i % 4 === 0 ? `${hours}:00` : ''
  };
});

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
  booths = [],
  teachers = [],
  students = [],
  subjects = []
}) => {
  const [editedLesson, setEditedLesson] = useState<EditableLessonUI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('single');
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('single');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteClassMutation = useClassSessionDelete();
  const deleteSeriesMutation = useClassSessionSeriesDelete();
  const updateClassMutation = useClassSessionUpdate();
  const updateSeriesMutation = useClassSessionSeriesUpdate();

  const isRecurringLesson = lesson.seriesId !== null;

  const getDisplayDate = (): Date => {
    if (lesson.date instanceof Date) {
      return lesson.date;
    }
    return new Date(lesson.date as string);
  };

  const { teacherAvailability, studentAvailability } = useAvailability(
    editedLesson?.teacherId || lesson.teacherId || undefined,
    editedLesson?.studentId || lesson.studentId || undefined,
    getDisplayDate(),
    DEFAULT_TIME_SLOTS
  );

  useEffect(() => {
    if (lesson && open) {
      setEditedLesson(convertToEditableUI(lesson));
      setEditMode('single');
      setDeleteMode('single');
    } else if (!open) {
      setEditedLesson(null);
      setError(null);
      setEditMode('single');
      setDeleteMode('single');
      setShowDeleteConfirm(false);
    }
  }, [lesson, open]);

  useEffect(() => {
    if (isRecurringLesson) {
      setDeleteMode(editMode === 'series' ? 'series' : 'single');
    }
  }, [editMode, isRecurringLesson]);

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
      case 'teacherId':
        updatedLesson.teacherId = value as string | null;
        break;
      case 'studentId':
        updatedLesson.studentId = value as string | null;
        break;
      case 'subjectId':
        updatedLesson.subjectId = value as string | null;
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

    if (editMode === 'series' && lesson.seriesId) {
      const seriesToSave: {
        seriesId: string;
        teacherId?: string | null;
        studentId?: string | null;
        subjectId?: string | null;
        startTime?: string;
        endTime?: string;
        boothId?: string;
        notes?: string | null;
      } = {
        seriesId: lesson.seriesId
      };

      if (editedLesson.teacherId !== undefined) {
        seriesToSave.teacherId = editedLesson.teacherId;
      }

      if (editedLesson.studentId !== undefined) {
        seriesToSave.studentId = editedLesson.studentId;
      }

      if (editedLesson.subjectId !== undefined) {
        seriesToSave.subjectId = editedLesson.subjectId;
      }

      if (editedLesson.formattedStartTime) {
        seriesToSave.startTime = editedLesson.formattedStartTime;
      }

      if (editedLesson.formattedEndTime) {
        seriesToSave.endTime = editedLesson.formattedEndTime;
      }

      if (editedLesson.boothId !== undefined) {
        seriesToSave.boothId = editedLesson.boothId || "";
      }

      if (editedLesson.notes !== undefined) {
        seriesToSave.notes = editedLesson.notes || "";
      }

      updateSeriesMutation.mutate(seriesToSave, {
        onSuccess: () => {
          onSave(editedLesson.classId, true);
          onModeChange('view');
        },
        onError: (error) => {
          console.error("シリーズの更新エラー:", error);
          setError("シリーズの更新に失敗しました");
        }
      });
    } else {
      const lessonToSave: {
        classId: string;
        teacherId?: string | null;
        studentId?: string | null;
        subjectId?: string | null;
        startTime?: string;
        endTime?: string;
        boothId?: string;
        notes?: string | null;
      } = {
        classId: editedLesson.classId
      };

      if (editedLesson.teacherId !== undefined) {
        lessonToSave.teacherId = editedLesson.teacherId;
      }

      if (editedLesson.studentId !== undefined) {
        lessonToSave.studentId = editedLesson.studentId;
      }

      if (editedLesson.subjectId !== undefined) {
        lessonToSave.subjectId = editedLesson.subjectId;
      }

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
          onSave(lessonToSave.classId, false);
          onModeChange('view');
        },
        onError: (error) => {
          console.error("授業の更新エラー:", error);
          setError("授業の更新に失敗しました");
        }
      });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!lesson.classId) return;

    if (deleteMode === 'series' && lesson.seriesId) {
      deleteSeriesMutation.mutate(lesson.seriesId, {
        onSuccess: () => {
          onDelete(lesson.classId);
        },
        onError: (error) => {
          console.error("シリーズの削除エラー:", error);
          setError("シリーズの削除に失敗しました");
        }
      });
    } else {
      deleteClassMutation.mutate(lesson.classId, {
        onSuccess: () => {
          onDelete(lesson.classId);
        },
        onError: (error) => {
          console.error("授業の削除エラー:", error);
          setError("授業の削除に失敗しました");
        }
      });
    }
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

  const teacherItems: SearchableSelectItem[] = teachers.map((teacher) => ({
    value: teacher.teacherId,
    label: teacher.name,
  }));

  const studentItems: SearchableSelectItem[] = students.map((student) => ({
    value: student.studentId,
    label: student.name,
  }));

  const subjectItems: SearchableSelectItem[] = subjects.map((subject) => ({
    value: subject.subjectId,
    label: subject.name,
  }));

  const isLoading = updateClassMutation.isPending || updateSeriesMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'view' ? '授業の詳細' : '授業の編集'}
              <span className={`text-sm font-normal ml-2 ${isRecurringLesson ? 'text-indigo-500 dark:text-indigo-400' : 'text-red-500 dark:text-red-400'}`}>
                ({lesson.classType?.name || lesson.classTypeName || '不明'})
              </span>
            </DialogTitle>
            <DialogDescription>
              {mode === 'view' ? '授業の詳細情報です' : '時間と教室を変更できます'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {mode === 'edit' && isRecurringLesson && (
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <RadioGroup
                  value={editMode}
                  onValueChange={(value: EditMode) => setEditMode(value)}
                  className="flex flex-row space-x-6"
                >
                  <div className="flex items-center space-x-2" >
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="text-sm font-normal cursor-pointer">
                      この授業のみ編集
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="series" id="series" />
                    <Label htmlFor="series" className="text-sm font-normal cursor-pointer">
                      シリーズ全体を編集
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {showDeleteConfirm && isRecurringLesson && (
              <div className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="mb-2">
                  <Label className="text-sm font-medium text-foreground">削除範囲を選択:</Label>
                </div>
                <RadioGroup
                  value={deleteMode}
                  onValueChange={(value: DeleteMode) => setDeleteMode(value)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="delete-single" />
                    <Label htmlFor="delete-single" className="text-sm font-normal cursor-pointer">
                      この授業のみ削除
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="series" id="delete-series" />
                    <Label htmlFor="delete-series" className="text-sm font-normal cursor-pointer">
                      シリーズ全体を削除 (本日以降の全授業)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">開始時間 {mode === 'edit' && <span className="text-destructive">*</span>}</label>
                {mode === 'edit' ? (
                  <div className="mt-1">
                    <TimeInput
                      value={editedLesson.formattedStartTime || ''}
                      onChange={(value) => handleInputChange('formattedStartTime', value)}
                      placeholder="開始時間を選択"
                      teacherAvailability={teacherAvailability}
                      studentAvailability={studentAvailability}
                      timeSlots={DEFAULT_TIME_SLOTS}
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
                      teacherAvailability={teacherAvailability}
                      studentAvailability={studentAvailability}
                      timeSlots={DEFAULT_TIME_SLOTS}
                    />
                  </div>
                ) : (
                  <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                    {editedLesson.formattedEndTime}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">科目</label>
                {mode === 'edit' ? (
                  <SearchableSelect
                    value={editedLesson.subjectId || ''}
                    onValueChange={(value) => handleInputChange('subjectId', value)}
                    items={subjectItems}
                    placeholder="科目を選択"
                    searchPlaceholder="科目を検索..."
                    emptyMessage="科目が見つかりません"
                  />
                ) : (
                  <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                    {lesson.subject?.name || lesson.subjectName || '指定なし'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">授業タイプ</label>
                <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                  {lesson.classType?.name || lesson.classTypeName || '指定なし'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">講師</label>
                {mode === 'edit' ? (
                  <SearchableSelect
                    value={editedLesson.teacherId || ''}
                    onValueChange={(value) => handleInputChange('teacherId', value)}
                    items={teacherItems}
                    placeholder="講師を選択"
                    searchPlaceholder="講師を検索..."
                    emptyMessage="講師が見つかりません"
                  />
                ) : (
                  <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                    {lesson.teacher?.name || lesson.teacherName || '指定なし'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">生徒</label>
                {mode === 'edit' ? (
                  <SearchableSelect
                    value={editedLesson.studentId || ''}
                    onValueChange={(value) => handleInputChange('studentId', value)}
                    items={studentItems}
                    placeholder="生徒を選択"
                    searchPlaceholder="生徒を検索..."
                    emptyMessage="生徒が見つかりません"
                  />
                ) : (
                  <div className="border rounded-md p-2 mt-1 bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground border-input">
                    {lesson.student?.name || lesson.studentName || '指定なし'}
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
                  onClick={handleDeleteClick}
                  disabled={deleteClassMutation.isPending || deleteSeriesMutation.isPending}
                >
                  削除{isRecurringLesson ? '...' : ''}
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
                      setEditMode('single');
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    className="transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    onClick={handleSave}
                    disabled={!canSave() || isLoading}
                  >
                    {isLoading ? (editMode === 'series' ? "シリーズ保存中..." : "保存中...") : "保存"}
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

      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={isRecurringLesson && deleteMode === 'series' ? 'シリーズの削除' : '授業の削除'}
        description={
          isRecurringLesson && deleteMode === 'series'
            ? `本当にこのシリーズの本日以降の全授業を削除しますか？\n\n${lesson.teacher?.name || lesson.teacherName || ''}先生の${lesson.subject?.name || lesson.subjectName || ''}の繰り返し授業がすべて削除されます。\n\n警告: 過去の授業は削除されませんが、今日以降の未来の授業はすべて削除されます。`
            : `本当にこの授業を削除しますか？\n\n${format(getDisplayDate(), 'yyyy年MM月dd日', { locale: ja })} ${editedLesson?.formattedStartTime || ''}の授業を削除します。${isRecurringLesson ? '\n\n注意: これは繰り返しシリーズの一部ですが、この授業のみが削除されます。' : ''}`
        }
        confirmText={deleteMode === 'series' ? 'シリーズを削除' : '削除'}
        cancelText="キャンセル"
        onConfirm={handleDelete}
        isLoading={deleteClassMutation.isPending || deleteSeriesMutation.isPending}
      />
    </>
  );
};