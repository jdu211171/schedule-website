'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ja } from 'date-fns/locale';

// Тип данных для занятия
type Lesson = {
  id: string;
  subject: string;
  teacher: string;
  student: string;
  room: string;
  startTime: Date;
  endTime: Date;
  color: string;
};

type LessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  mode: 'view' | 'edit';
  onSave?: (updatedLesson: Lesson) => void;
  onDelete?: (lessonId: string) => void;
};

// Временные данные для выпадающих списков
const subjects = [
  { id: 'math', name: '数学' },
  { id: 'physics', name: '物理' },
  { id: 'english', name: '英語' },
  { id: 'chemistry', name: '化学' },
  { id: 'biology', name: '生物' }
];

const teachers = [
  { id: '1', name: 'ペトロフ I.I.' },
  { id: '2', name: 'シドロワ E.V.' },
  { id: '3', name: 'コズロワ M.A.' }
];

const students = [
  { id: '1', name: 'イワノフ A.' },
  { id: '2', name: 'スミルノフ K.' },
  { id: '3', name: 'ペトロワ S.' }
];

const rooms = Array.from({ length: 15 }, (_, i) => ({
  id: `${i + 101}`,
  name: `教室 ${i + 101}`
}));

// Создаем массив часов и минут для выбора времени
const hours = Array.from({ length: 14 }, (_, i) => i + 8); // от 8 до 21
const minutes = [0, 15, 30, 45];

// Функция для форматирования времени
const formatTime = (date: Date) => {
  return format(date, 'HH:mm');
};

// Функция для форматирования даты
const formatDate = (date: Date) => {
  return format(date, 'yyyy年MM月dd日', { locale: ja });
};

// Функция для получения имени по id
const getItemName = (id: string, items: { id: string; name: string }[]) => {
  const item = items.find(item => item.id === id);
  return item ? item.name : id;
};

export default function LessonDialog({ 
  open, 
  onOpenChange, 
  lesson, 
  mode,
  onSave,
  onDelete 
}: LessonDialogProps) {
  // Хуки всегда вызываются в начале функции, до всяких условий
  const [editedLesson, setEditedLesson] = useState<Lesson | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Используем useEffect для обновления состояния, когда меняются пропсы
  useEffect(() => {
    if (lesson) {
      setEditedLesson(lesson);
      setIsEditing(mode === 'edit');
    }
  }, [lesson, mode]);
  
  // Проверка после хуков
  if (!lesson || !editedLesson) {
    return null;
  }
  
  // Получаем отображаемые имена
  const subjectName = getItemName(editedLesson.subject, subjects);
  const teacherName = getItemName(editedLesson.teacher, teachers);
  const studentName = getItemName(editedLesson.student, students);
  const roomName = getItemName(editedLesson.room, rooms);

  // Обработчик изменения полей
  const handleChange = (field: keyof Lesson, value: string) => {
    setEditedLesson(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  // Обработчик изменения времени
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    if (!editedLesson) return;
    
    const [hourStr, minuteStr] = value.split(':');
    const hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    
    const newDate = new Date(editedLesson[field]);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    
    setEditedLesson(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: newDate
      };
    });
  };

  // Обработчик сохранения изменений
  const handleSave = () => {
    if (onSave && editedLesson) {
      onSave(editedLesson);
    }
    setIsEditing(false);
  };

  // Обработчик удаления урока
  const handleDelete = () => {
    if (onDelete && window.confirm('本当にこの授業を削除しますか？')) {
      onDelete(lesson.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '授業の編集' : '授業の詳細'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? '授業の情報を更新してください' 
              : '授業の詳細情報です'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Дата */}
          <div>
            <Label className="text-sm font-medium">日付</Label>
            <div className="border rounded-md p-2 mt-1">
              {formatDate(editedLesson.startTime)}
            </div>
          </div>
          
          {/* Время - улучшенный дизайн с использованием Select */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">開始時間</Label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Select 
                    value={editedLesson.startTime.getHours().toString().padStart(2, '0')}
                    onValueChange={(hour) => {
                      const newTime = `${hour}:${editedLesson.startTime.getMinutes().toString().padStart(2, '0')}`;
                      handleTimeChange('startTime', newTime);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={editedLesson.startTime.getMinutes().toString().padStart(2, '0')}
                    onValueChange={(minute) => {
                      const newTime = `${editedLesson.startTime.getHours().toString().padStart(2, '0')}:${minute}`;
                      handleTimeChange('startTime', newTime);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="border rounded-md p-2 mt-1">
                  {formatTime(editedLesson.startTime)}
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">終了時間</Label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Select 
                    value={editedLesson.endTime.getHours().toString().padStart(2, '0')}
                    onValueChange={(hour) => {
                      const newTime = `${hour}:${editedLesson.endTime.getMinutes().toString().padStart(2, '0')}`;
                      handleTimeChange('endTime', newTime);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="時" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                          {hour.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={editedLesson.endTime.getMinutes().toString().padStart(2, '0')}
                    onValueChange={(minute) => {
                      const newTime = `${editedLesson.endTime.getHours().toString().padStart(2, '0')}:${minute}`;
                      handleTimeChange('endTime', newTime);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="分" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map((minute) => (
                        <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="border rounded-md p-2 mt-1">
                  {formatTime(editedLesson.endTime)}
                </div>
              )}
            </div>
          </div>
          
          {/* Остальной код без изменений */}
          {/* Предмет - улучшенный дизайн */}
          <div>
            <Label className="text-sm font-medium">科目</Label>
            {isEditing ? (
              <Select
                value={editedLesson.subject}
                onValueChange={(value) => handleChange('subject', value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center">
                        <span>{subject.name}</span>
                        {subject.id === lesson.subject && (
                          <span className="ml-2 text-xs text-muted-foreground">(現在)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border rounded-md p-2 mt-1">
                {subjectName}
              </div>
            )}
          </div>
          
          {/* Преподаватель - улучшенный дизайн */}
          <div>
            <Label className="text-sm font-medium">先生</Label>
            {isEditing ? (
              <Select
                value={editedLesson.teacher}
                onValueChange={(value) => handleChange('teacher', value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="先生を選択" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex items-center">
                        <span>{teacher.name}</span>
                        {teacher.id === lesson.teacher && (
                          <span className="ml-2 text-xs text-muted-foreground">(現在)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border rounded-md p-2 mt-1">
                {teacherName}
              </div>
            )}
          </div>
          
          {/* Ученик - улучшенный дизайн */}
          <div>
            <Label className="text-sm font-medium">学生</Label>
            {isEditing ? (
              <Select
                value={editedLesson.student}
                onValueChange={(value) => handleChange('student', value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="学生を選択" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center">
                        <span>{student.name}</span>
                        {student.id === lesson.student && (
                          <span className="ml-2 text-xs text-muted-foreground">(現在)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border rounded-md p-2 mt-1">
                {studentName}
              </div>
            )}
          </div>
          
          {/* Комната - улучшенный дизайн */}
          <div>
            <Label className="text-sm font-medium">教室</Label>
            {isEditing ? (
              <Select
                value={editedLesson.room}
                onValueChange={(value) => handleChange('room', value)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="教室を選択" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      <div className="flex items-center">
                        <span>{room.name}</span>
                        {room.id === lesson.room && (
                          <span className="ml-2 text-xs text-muted-foreground">(現在)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border rounded-md p-2 mt-1">
                {roomName}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          {isEditing ? (
            <>
              <Button variant="destructive" onClick={handleDelete}>
                削除
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave}>
                  保存
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                閉じる
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                編集
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}