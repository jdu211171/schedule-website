'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from "@/components/ui/checkbox";
import { ja } from 'date-fns/locale';
import { format, startOfWeek, addDays } from 'date-fns';

type Room = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
  color?: string;
};

type Teacher = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
};

export type CalendarFilterType = 'day' | 'week';

type CalendarFiltersProps = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  rooms: Room[];
  selectedRooms: string[];
  onRoomsChange: (rooms: string[]) => void;
  subjects?: Subject[];
  selectedSubjects?: string[];
  onSubjectsChange?: (subjects: string[]) => void;
  teachers?: Teacher[];
  selectedTeachers?: string[];
  onTeachersChange?: (teachers: string[]) => void;
  students?: Student[];
  selectedStudents?: string[];
  onStudentsChange?: (students: string[]) => void;
  filterType?: CalendarFilterType;
  onClose: () => void;
  onApplyFilters: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
};

export default function CalendarFilters({
  selectedDate,
  onDateChange,
  rooms,
  selectedRooms,
  onRoomsChange,
  subjects = [],
  selectedSubjects = [],
  onSubjectsChange,
  teachers = [],
  selectedTeachers = [],
  onTeachersChange,
  students = [],
  selectedStudents = [],
  onStudentsChange,
  filterType = 'day',
  onClose,
  onApplyFilters,
  buttonRef
}: CalendarFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'subjects' | 'teachers' | 'students'>('rooms');
  const [position, setPosition] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (buttonRef && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      setPosition({
        top: buttonRect.top + window.scrollY,
        right: windowWidth - buttonRect.right - window.scrollX - 20 
      });
    }
  }, [buttonRef]);

  // Фильтрация элементов по поисковому запросу
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    room.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    subject.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    teacher.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчик изменения выбора элемента
  const toggleItemSelection = (id: string, type: 'rooms' | 'subjects' | 'teachers' | 'students') => {
    switch (type) {
      case 'rooms':
        if (selectedRooms.includes(id)) {
          onRoomsChange(selectedRooms.filter(roomId => roomId !== id));
        } else {
          onRoomsChange([...selectedRooms, id]);
        }
        break;
      case 'subjects':
        if (onSubjectsChange) {
          if (selectedSubjects.includes(id)) {
            onSubjectsChange(selectedSubjects.filter(subjectId => subjectId !== id));
          } else {
            onSubjectsChange([...selectedSubjects, id]);
          }
        }
        break;
      case 'teachers':
        if (onTeachersChange) {
          if (selectedTeachers.includes(id)) {
            onTeachersChange(selectedTeachers.filter(teacherId => teacherId !== id));
          } else {
            onTeachersChange([...selectedTeachers, id]);
          }
        }
        break;
      case 'students':
        if (onStudentsChange) {
          if (selectedStudents.includes(id)) {
            onStudentsChange(selectedStudents.filter(studentId => studentId !== id));
          } else {
            onStudentsChange([...selectedStudents, id]);
          }
        }
        break;
    }
  };

  // Форматирование даты для отображения
  const formatDate = (date: Date) => {
    if (filterType === 'day') {
      return format(date, 'yyyy/MM/dd');
    } else {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Понедельник
      const weekEnd = addDays(weekStart, 6); // Воскресенье
      
      return `${format(weekStart, 'MM/dd')} - ${format(weekEnd, 'MM/dd')}`;
    }
  };

  // Обработчик изменения даты
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setShowCalendar(false);
    }
  };
  const selectAll = (type: 'rooms' | 'subjects' | 'teachers' | 'students') => {
    switch (type) {
      case 'rooms':
        onRoomsChange(rooms.map(room => room.id));
        break;
      case 'subjects':
        if (onSubjectsChange) {
          onSubjectsChange(subjects.map(subject => subject.id));
        }
        break;
      case 'teachers':
        if (onTeachersChange) {
          onTeachersChange(teachers.map(teacher => teacher.id));
        }
        break;
      case 'students':
        if (onStudentsChange) {
          onStudentsChange(students.map(student => student.id));
        }
        break;
    }
  };
  
  const deselectAll = (type: 'rooms' | 'subjects' | 'teachers' | 'students') => {
    switch (type) {
      case 'rooms':
        onRoomsChange([]);
        break;
      case 'subjects':
        if (onSubjectsChange) {
          onSubjectsChange([]);
        }
        break;
      case 'teachers':
        if (onTeachersChange) {
          onTeachersChange([]);
        }
        break;
      case 'students':
        if (onStudentsChange) {
          onStudentsChange([]);
        }
        break;
    }
  };

  return (
    <div 
      className="fixed z-50 filter-dialog"
      style={{ 
        top: `${position.top}px`,
        right: `${position.right}px`,
        animation: 'none' 
      }}
    >
      <Card className="p-4 w-[320px] flex flex-col space-y-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">フィルター</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Выбор даты только для дневного представления */}
        {filterType === 'day' && (
          <div>
            <h4 className="text-sm font-medium mb-2">日付</h4>
            <Button 
              variant="outline" 
              className="w-full justify-between text-left font-normal"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {formatDate(selectedDate)}
            </Button>
            
            {showCalendar && (
              <div className="mt-2 border rounded-md bg-background">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  locale={ja}
                  weekStartsOn={1} // Неделя начинается с понедельника
                  showOutsideDays={true}
                  disabled={(date) => {
                    const now = new Date();
                    const tooEarly = new Date(now);
                    tooEarly.setDate(now.getDate() - 365);
                    const tooLate = new Date(now);
                    tooLate.setDate(now.getDate() + 365);
                    return date < tooEarly || date > tooLate;
                  }}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Вкладки фильтров */}
        <div className="border-b flex space-x-2">
          <Button 
            variant={activeTab === 'rooms' ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setActiveTab('rooms')}
            className="px-2 py-1 h-8"
          >
            教室
          </Button>
          {subjects.length > 0 && (
            <Button 
              variant={activeTab === 'subjects' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab('subjects')}
              className="px-2 py-1 h-8"
            >
              科目
            </Button>
          )}
          {teachers.length > 0 && (
            <Button 
              variant={activeTab === 'teachers' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab('teachers')}
              className="px-2 py-1 h-8"
            >
              講師
            </Button>
          )}
          {students.length > 0 && (
            <Button 
              variant={activeTab === 'students' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTab('students')}
              className="px-2 py-1 h-8"
            >
              生徒
            </Button>
          )}
        </div>
        
        {/* Поиск */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Input
              type="text" 
              placeholder="検索..."
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Кнопки выбора/отмены всего */}
          <div className="flex justify-between mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectAll(activeTab)}
              className="text-xs px-2 py-1 h-7"
            >
              すべて選択
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => deselectAll(activeTab)}
              className="text-xs px-2 py-1 h-7"
            >
              すべて解除
            </Button>
          </div>
        </div>
        
        {/* Фильтр комнат */}
        {activeTab === 'rooms' && (
          <div className="max-h-[200px] overflow-y-auto">
            {filteredRooms.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {filteredRooms.map((room) => (
                  <Button
                    key={room.id}
                    variant={selectedRooms.includes(room.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleItemSelection(room.id, 'rooms')}
                    className="text-xs h-8"
                  >
                    {room.name || room.id}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">該当なし</div>
            )}
          </div>
        )}
        
        {/* Фильтр предметов */}
        {activeTab === 'subjects' && (
          <div className="max-h-[200px] overflow-y-auto">
            {filteredSubjects.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          toggleItemSelection(subject.id, 'subjects');
                        } else {
                          toggleItemSelection(subject.id, 'subjects');
                        }
                      }}
                    />
                    {subject.color && (
                      <div className={`w-3 h-3 rounded-full bg-${subject.color.split('-')[0]}-${subject.color.split('-')[1]}`} />
                    )}
                    <label 
                      htmlFor={`subject-${subject.id}`} 
                      className="text-xs cursor-pointer"
                    >
                      {subject.name}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">該当なし</div>
            )}
          </div>
        )}
        
        {/* Фильтр преподавателей */}
        {activeTab === 'teachers' && (
          <div className="max-h-[200px] overflow-y-auto">
            {filteredTeachers.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {filteredTeachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          toggleItemSelection(teacher.id, 'teachers');
                        } else {
                          toggleItemSelection(teacher.id, 'teachers');
                        }
                      }}
                    />
                    <label 
                      htmlFor={`teacher-${teacher.id}`} 
                      className="text-sm cursor-pointer"
                    >
                      {teacher.name}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">該当なし</div>
            )}
          </div>
        )}
        
        {/* Фильтр учеников */}
        {activeTab === 'students' && (
          <div className="max-h-[200px] overflow-y-auto">
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          toggleItemSelection(student.id, 'students');
                        } else {
                          toggleItemSelection(student.id, 'students');
                        }
                      }}
                    />
                    <label 
                      htmlFor={`student-${student.id}`} 
                      className="text-sm cursor-pointer"
                    >
                      {student.name}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">該当なし</div>
            )}
          </div>
        )}
        
        <Button onClick={onApplyFilters} className="w-full">フィルターを適用する</Button>
      </Card>
    </div>
  );
}