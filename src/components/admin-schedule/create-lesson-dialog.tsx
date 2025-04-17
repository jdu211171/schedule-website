'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { SUBJECTS_LIST, TEACHERS_LIST, STUDENTS_LIST, getSubjectColor } from './subjectUtils';

type CreateLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonData: {
    startTime: string;
    endTime: string;
    roomId: string;
  } | null;
  selectedDate: Date;
  selectedRooms: string[];
  onSave: (lessonData: LessonData) => void 
};

type LessonData = {
  id: string;
  subject: string;
  teacher: string;
  student: string;
  room: string;
  startTime: Date;
  endTime: Date;
  color: string;
};

export default function CreateLessonDialog({
  open,
  onOpenChange,
  lessonData,
  selectedDate,
  selectedRooms, 
  onSave
}: CreateLessonDialogProps) {
  
  // Состояния для полей формы
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [student, setStudent] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  
  useEffect(() => {
    if (subject) {
      const color = getSubjectColor(subject);
      setCurrentColor(color);
    } else {
      setCurrentColor('');
    }
  }, [subject]);
  
  // Функция для форматирования даты
  const formatDate = (date: Date) => {
    return format(date, 'yyyy年MM月dd日', { locale: ja });
  };
  
  // Обработчик отправки формы
  const handleSubmit = () => {
    const roomId = lessonData?.roomId;
    const validRoomId = roomId && selectedRooms.includes(roomId) 
      ? roomId 
      : selectedRooms[0];
    
    const color = getSubjectColor(subject);
    
    // Создание объекта данных урока с цветом, соответствующим предмету
    const newLesson: LessonData = {
      id: Date.now().toString(), 
      subject,
      teacher,
      student,
      room: validRoomId,
      startTime: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${lessonData?.startTime}`),
      endTime: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${lessonData?.endTime}`),
      color  
    };
    
    onSave(newLesson);
    
    setSubject('');
    setTeacher('');
    setStudent('');
    setCurrentColor('');
  };
  
  if (!lessonData) return null;
  
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
              <div className="border rounded-md p-2 mt-1">
                {formatDate(selectedDate)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">教室</label>
              <div className="border rounded-md p-2 mt-1">
                教室 {lessonData.roomId}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">開始時間</label>
              <div className="border rounded-md p-2 mt-1">
                {lessonData.startTime}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">終了時間</label>
              <div className="border rounded-md p-2 mt-1">
                {lessonData.endTime}
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">科目</label>
            <select 
              className={`w-full rounded-md p-2 mt-1 ${subject ? currentColor : 'border'}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">科目を選択</option>
              {SUBJECTS_LIST.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">講師</label>
            <select 
              className="w-full border rounded-md p-2 mt-1"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">講師を選択</option>
              {TEACHERS_LIST.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">生徒</label>
            <select 
              className="w-full border rounded-md p-2 mt-1"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              <option value="">生徒を選択</option>
              {STUDENTS_LIST.map(student => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!subject || !teacher || !student}
          >
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}