'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
import CalendarFilters from './AdminCalendarDayFilter';
import LessonDialog from './LessonDialog';

// Временный тип данных для занятия
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

// Временный тип данных для комнаты
type Room = {
  id: string;
  name: string;
};

type AdminCalendarDayProps = {
  mode?: 'view' | 'create';
};

export default function AdminCalendarDay({ mode = 'view' }: AdminCalendarDayProps) {
  // Состояния
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectionStart, setSelectionStart] = useState<{row: number, col: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{row: number, col: number} | null>(null);
  // Добавляем переменную containerWidth
  const [containerWidth, setContainerWidth] = useState<number>(1200); // Значение по умолчанию
  
  // Состояние для диалога создания занятия
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLessonData, setNewLessonData] = useState<{
    startTime: string;
    endTime: string;
    roomId: string;
  } | null>(null);
  
  // Новые состояния для просмотра/редактирования урока
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [lessonDialogMode, setLessonDialogMode] = useState<'view' | 'edit'>('view');
  
  // Референс для контейнера таблицы
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Обновление ширины контейнера при изменении размера окна
  useEffect(() => {
    const updateContainerWidth = () => {
      if (tableContainerRef.current) {
        setContainerWidth(tableContainerRef.current.clientWidth);
      }
    };
    
    // Инициализируем ширину контейнера
    updateContainerWidth();
    
    // Добавляем обработчик изменения размера окна
    window.addEventListener('resize', updateContainerWidth);
    
    // Удаляем обработчик при размонтировании компонента
    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, []);

  // Временный массив временных интервалов (каждые 15 минут с 8:00 до 22:00)
  const timeSlots = Array.from({ length: 57 }, (_, i) => {
    const hours = Math.floor(i / 4) + 8;
    const startMinutes = (i % 4) * 15;
    const endHours = startMinutes === 45 ? hours + 1 : hours;
    const endMinutes = startMinutes === 45 ? 0 : startMinutes + 15;
    
    return {
      index: i,
      start: `${hours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
      end: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
      display: `${hours}<sup>${startMinutes === 0 ? '00' : startMinutes}</sup> - ${endHours}<sup>${endMinutes === 0 ? '00' : endMinutes}</sup>`,
      shortDisplay: i % 4 === 0 ? `${hours}<sup>00</sup>` : ''
    };
  });

  // Временный массив комнат
  useEffect(() => {
    // В реальном приложении здесь будет API запрос
    setRooms(Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 101}`,
      name: `教室 ${i + 101}`
    })));
    setSelectedRooms(Array.from({ length: 15 }, (_, i) => `${i + 101}`));
  }, []);

  // Временная функция для получения занятий
  useEffect(() => {
    // В реальном приложении здесь будет API запрос с учетом выбранной даты и фильтров
    const fakeData: Lesson[] = [
      {
        id: '1',
        subject: 'Математика',
        teacher: 'Петров И.И.',
        student: 'Иванов А.',
        room: '101',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 0),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 15),
        color: 'bg-blue-100 border-blue-300'
      },
      {
        id: '2',
        subject: 'Физика',
        teacher: 'Сидорова Е.В.',
        student: 'Смирнов К.',
        room: '102',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 15),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 45),
        color: 'bg-green-100 border-green-300'
      },
      {
        id: '3',
        subject: 'Английский',
        teacher: 'Козлова М.А.',
        student: 'Петрова С.',
        room: '103',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 30),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 45),
        color: 'bg-purple-100 border-purple-300'
      },
      {
        id: '4',
        subject: 'Занятие 4',
        teacher: 'Учитель Н.Н.',
        student: 'Ученик В.',
        room: '104',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 0),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 0),
        color: 'bg-red-100 border-red-300'
      },
    ];
    setLessons(fakeData);
  }, [selectedDate, selectedRooms]);

// Функция для обновления линии текущего времени, обернутая в useCallback
const updateTimeLine = useCallback(() => {
  const currentTime = new Date();
  const today = new Date();
  
  // Проверяем, отображается ли сегодняшний день
  const isSameDay = selectedDate.getDate() === today.getDate() && 
                   selectedDate.getMonth() === today.getMonth() && 
                   selectedDate.getFullYear() === today.getFullYear();
  
  if (tableContainerRef.current && isSameDay) {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // Проверяем, находится ли текущее время в пределах отображаемого диапазона (8:00-22:00)
    if (hours >= 8 && hours < 22) {
      // Вычисляем позицию линии времени
      const hourIndex = hours - 8;
      const quarterIndex = Math.floor(minutes / 15);
      const rowIndex = hourIndex * 4 + quarterIndex;
      
      // Удаляем старую линию, если она есть
      const oldLine = document.querySelector('.current-time-line');
      if (oldLine) {
        oldLine.remove();
      }
      
      // Создаем новую линию
      const timeRows = document.querySelectorAll('[data-time-row]');
      if (timeRows && timeRows.length > rowIndex) {
        const targetRow = timeRows[rowIndex];
        const rect = targetRow.getBoundingClientRect();
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const topOffset = rect.top - containerRect.top + tableContainerRef.current.scrollTop;
        
        const line = document.createElement('div');
        line.className = 'current-time-line absolute w-full border-t-2 border-red-500 z-30';
        line.style.top = `${topOffset}px`;
        
        // Добавляем маркер времени
        const timeMarker = document.createElement('div');
        timeMarker.className = 'absolute -left-1 -top-2 w-4 h-4 rounded-full bg-red-500 z-30';
        line.appendChild(timeMarker);
        
        tableContainerRef.current.appendChild(line);
        
        // Автоматическая прокрутка к текущему времени
        tableContainerRef.current.scrollTop = Math.max(0, topOffset - 200);
      }
    }
  }
}, [selectedDate, tableContainerRef]);

  // Функция для отображения текущего времени
  useEffect(() => {
    // Обновляем линию времени немедленно
    setTimeout(updateTimeLine, 100); // Добавляем небольшую задержку
    
    // Затем обновляем каждую минуту
    const interval = setInterval(updateTimeLine, 60000);
    
    return () => clearInterval(interval);
  }, [updateTimeLine]);

  // Обработчики выбора ячеек - активны только в режиме создания
  const handleCellMouseDown = (timeIndex: number, roomIndex: number) => {
    if (mode === 'create') {
      setSelectionStart({ row: timeIndex, col: roomIndex });
      setSelectionEnd({ row: timeIndex, col: roomIndex });
    }
  };

  const handleCellMouseMove = (timeIndex: number, roomIndex: number) => {
    if (mode === 'create' && selectionStart) {
      setSelectionEnd({ row: timeIndex, col: roomIndex });
    }
  };

  const handleCellMouseUp = () => {
    if (mode === 'create' && selectionStart && selectionEnd) {
      // Преобразуем индексы в реальное время и ID комнаты
      const startTimeIndex = Math.min(selectionStart.row, selectionEnd.row);
      const endTimeIndex = Math.max(selectionStart.row, selectionEnd.row);
      const roomIndex = selectionStart.col; // Предполагаем, что выбор происходит в рамках одной комнаты
      
      const startTime = timeSlots[startTimeIndex].start;
      const endTime = timeSlots[endTimeIndex].end;
      const roomId = selectedRooms[roomIndex];
      
      // Открываем диалог создания занятия
      setNewLessonData({
        startTime,
        endTime,
        roomId
      });
      setShowCreateDialog(true);
      
      // Сбрасываем выделение после обработки
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // Определяем, выбрана ли ячейка
  const isCellSelected = (timeIndex: number, roomIndex: number) => {
    if (!selectionStart || !selectionEnd) return false;
    
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    
    return timeIndex >= minRow && timeIndex <= maxRow && roomIndex >= minCol && roomIndex <= maxCol;
  };

  // Функция для форматирования даты
  const formatDate = (date: Date) => {
    return format(date, 'yyyy年MM月dd日', { locale: ja });
  };

  // Функция для навигации по датам
  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Обработчики для диалога урока
  const handleSaveLesson = (updatedLesson: Lesson) => {
    // Обновляем урок в списке
    setLessons(prevLessons => 
      prevLessons.map(lesson => 
        lesson.id === updatedLesson.id ? updatedLesson : lesson
      )
    );
    
    // В реальном приложении здесь будет API запрос для сохранения изменений
    setShowLessonDialog(false);
  };

  const handleDeleteLesson = (lessonId: string) => {
    // Удаляем урок из списка
    setLessons(prevLessons => 
      prevLessons.filter(lesson => lesson.id !== lessonId)
    );
    
    // В реальном приложении здесь будет API запрос для удаления
    setShowLessonDialog(false);
  };

  // Функция для отображения занятия в таблице
  const renderLesson = (lesson: Lesson) => {
    // Извлечение времени из объектов Date
    const startHour = lesson.startTime.getHours();
    const startMinute = lesson.startTime.getMinutes();
    const endHour = lesson.endTime.getHours();
    const endMinute = lesson.endTime.getMinutes();
    
    // Находим соответствующие ячейки времени
    // Для начала занятия: начало соответствующего интервала
    const startTimeIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
    
    // Для конца занятия: слот, в котором находится время окончания урока
    // Например, для 14:15 мы берем слот "14:00 - 14:15", а не "14:15 - 14:30"
    // Это исправляет проблему с наложением уроков
    const endTimeIndex = (endHour - 8) * 4 + (endMinute === 0 ? -1 : Math.ceil(endMinute / 15) - 1);
    
    const roomIndex = selectedRooms.indexOf(lesson.room);
    if (roomIndex === -1) return null;
    
    // Находим соответствующие строки в DOM для начала и конца урока
    const rows = document.querySelectorAll('[data-time-row]');
    if (!rows || rows.length === 0) return null;
    
    const startRow = rows[startTimeIndex];
    const endRow = rows[endTimeIndex];
    
    if (!startRow || !endRow) return null;
    
    // Получаем позиции строк относительно контейнера
    const containerRect = document.querySelector('[data-time-grid-container]')?.getBoundingClientRect();
    if (!containerRect) return null;
    
    const startRect = startRow.getBoundingClientRect();
    const endRect = endRow.getBoundingClientRect();
    
    // Вычисляем относительные координаты
    const top = startRect.top - containerRect.top;
    // Используем высоту до конца выбранного слота, но не захватываем следующий
    // 30px - высота строки
    const height = (endRect.top - startRect.top) + (endMinute === 0 ? 0 : 30);
    
    return (
      <div 
        key={lesson.id}
        className={`${lesson.color} border rounded-md p-1 text-xs shadow overflow-hidden absolute 
          transition-all duration-150 group hover:shadow-md hover:brightness-95 active:brightness-90`}
        style={{
          top: `${top}px`,
          left: `${100 + roomIndex * 100}px`, 
          width: `98px`,
          height: `${height}px`,
          zIndex: 20,
          cursor: 'pointer'
        }}
        onClick={(e) => {
          // Останавливаем всплытие события, чтобы избежать конфликтов
          e.stopPropagation();
          
          // Открываем диалог с информацией об уроке
          setSelectedLesson(lesson);
          setLessonDialogMode('view');
          setShowLessonDialog(true);
        }}
      >
        {/* Визуальный индикатор наведения */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity" />
        
        {/* Иконка просмотра - появляется при наведении */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 bg-white rounded-full p-0.5 transform scale-0 group-hover:scale-100 transition-all shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        
        {/* Содержимое карточки */}
        <div className="font-bold truncate">{lesson.subject}</div>
        <div className="truncate">{lesson.teacher}</div>
        <div className="truncate">{lesson.student}</div>
        <div className="text-xs opacity-75 truncate">
          {startHour}:{startMinute.toString().padStart(2, '0')} - {endHour}:{endMinute.toString().padStart(2, '0')}
        </div>
      </div>
    );
  };
  
  // Рендерим компонент после монтирования для доступа к DOM
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Функция для отображения временных интервалов с верхними индексами
  const renderTimeSlotLabel = (timeSlot: typeof timeSlots[0]) => {
    return (
      <div className="text-sm">
        {timeSlot.index % 4 === 0 ? (
          <span dangerouslySetInnerHTML={{ __html: timeSlot.display }} />
        ) : (
          <span className="text-gray-400 text-xs" dangerouslySetInnerHTML={{ __html: timeSlot.shortDisplay }} />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4 relative w-full">
      {/* Верхняя панель с кнопками */}
      <div className="flex justify-between items-center w-full">
        <h2 className="font-semibold">{mode === 'view' ? 'スケジュール閲覧' : '授業マッチング'}</h2>
        <div className="flex space-x-2">
          <Button onClick={goToPreviousDay} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={goToToday} variant="outline" size="sm">
            今日
          </Button>
          <Button onClick={goToNextDay} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="ml-2 font-medium">
            {formatDate(selectedDate)}
          </div>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="ml-4">
            <Filter className="w-4 h-4 mr-2" />
            フィルター
          </Button>
          {mode === 'create' && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              授業を追加
            </Button>
          )}
        </div>
      </div>
      
      {/* Таблица календаря на полную ширину */}
      <div className="w-full border rounded-md overflow-hidden">
        <div 
          className="relative overflow-auto" 
          style={{ maxHeight: 'calc(100vh - 200px)' }} 
          ref={tableContainerRef}
        >
          <div className="relative w-full" data-time-grid-container style={{ 
            minWidth: `${Math.max((selectedRooms.length + 1) * 100, containerWidth)}px`,
          }}>
            {/* Заголовок с номерами комнат */}
            <div 
              className="sticky top-0 grid grid-cols-[100px_repeat(auto-fill,minmax(100px,1fr))] z-40 bg-card shadow" 
              style={{ height: '40px' }}
            >
              <div className="flex items-center justify-center font-semibold border-b border-r">
                時間
              </div>
              {selectedRooms.map((roomId) => (
                <div 
                  key={roomId} 
                  className="flex items-center justify-center font-semibold border-b border-r"
                >
                  教室 {roomId}
                </div>
              ))}
            </div>
            
            {/* Слой 1: Сетка времени и ячейки (z-index: 1-10) */}
            <div className="relative z-10">
              {timeSlots.map((timeSlot, timeIndex) => (
                <div 
                  key={timeSlot.start}
                  data-time-row
                  data-time-index={timeIndex}
                  className="flex relative" 
                  style={{ height: '30px' }}
                >
                  {/* Ячейка времени с новым форматом отображения */}
                  <div 
                    className={`sticky left-0 w-[100px] flex items-center justify-center bg-card z-20 border-r
                      ${timeIndex % 4 === 0 ? "font-semibold border-b" : "border-b border-dashed"}`}
                  >
                    {renderTimeSlotLabel(timeSlot)}
                  </div>
                  
                  {/* Ячейки для каждой комнаты */}
                  {selectedRooms.map((roomId, roomIndex) => (
                    <div 
                      key={`${timeSlot.start}-${roomId}`}
                      className={`w-[100px] border-r
                        ${timeIndex % 4 === 0 ? "border-b" : "border-b border-dashed"}
                        ${isCellSelected(timeIndex, roomIndex) ? "bg-blue-100" : ""}
                        ${mode === 'create' ? "cursor-pointer" : ""}`}
                      onMouseDown={(e) => {
                        if (mode === 'create') {
                          e.stopPropagation();
                          handleCellMouseDown(timeIndex, roomIndex);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (mode === 'create' && selectionStart) {
                          e.stopPropagation();
                          handleCellMouseMove(timeIndex, roomIndex);
                        }
                      }}
                      onMouseUp={(e) => {
                        if (mode === 'create' && selectionStart) {
                          e.stopPropagation();
                          handleCellMouseUp();
                        }
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            
            {/* Слой 2: Уроки (z-index: 20) - отображаем только если компонент смонтирован */}
            {mounted && (
              <div className="absolute top-0 left-0 w-full h-full pointer-events-auto">
                {lessons.map(lesson => renderLesson(lesson))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Фильтры - выпадающее окно поверх таблицы */}
      {showFilters && (
        <CalendarFilters 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          rooms={rooms}
          selectedRooms={selectedRooms}
          onRoomsChange={setSelectedRooms}
          onClose={() => setShowFilters(false)}
          onApplyFilters={() => {
            // Здесь будет логика применения фильтров, обновление данных
            setShowFilters(false);
          }}
        />
      )}

      {/* Диалог создания занятия */}
      {showCreateDialog && newLessonData && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                    教室 {newLessonData.roomId}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">開始時間</label>
                  <div className="border rounded-md p-2 mt-1">
                    {newLessonData.startTime}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">終了時間</label>
                  <div className="border rounded-md p-2 mt-1">
                    {newLessonData.endTime}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">科目</label>
                <select className="w-full border rounded-md p-2 mt-1">
                  <option value="">科目を選択</option>
                  <option value="math">数学</option>
                  <option value="physics">物理</option>
                  <option value="english">英語</option>
                  <option value="chemistry">化学</option>
                  <option value="biology">生物</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">先生</label>
                <select className="w-full border rounded-md p-2 mt-1">
                  <option value="">先生を選択</option>
                  <option value="1">ペトロフ I.I.</option>
                  <option value="2">シドロワ E.V.</option>
                  <option value="3">コズロワ M.A.</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">学生</label>
                <select className="w-full border rounded-md p-2 mt-1">
                  <option value="">学生を選択</option>
                  <option value="1">イワノフ A.</option>
                  <option value="2">スミルノフ K.</option>
                  <option value="3">ペトロワ S.</option>
                </select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={() => {
                // Здесь будет логика создания занятия
                alert('授業が作成されました！');
                setShowCreateDialog(false);
              }}>
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
<LessonDialog
  open={showLessonDialog}
  onOpenChange={setShowLessonDialog}
  lesson={selectedLesson}
  mode={lessonDialogMode}
  onSave={handleSaveLesson}
  onDelete={handleDeleteLesson}
/>
    </div>
  );
}
