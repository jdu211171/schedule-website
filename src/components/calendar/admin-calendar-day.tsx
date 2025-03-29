'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import CalendarFilters from './admin-calendar-day-filter';
import EditLessonDialog from './edit-lesson-dialog';
import CreateLessonDialog from './create-lesson-dialog';
import LessonCard from './lesson-card';
import { getSubjectColor } from './subjectUtils';

// Типы данных
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

type Room = {
  id: string;
  name: string;
};

type AdminCalendarDayProps = {
  mode?: 'view' | 'create';
};

// Добавляем стили для курсоров
const styles = `
.cursor-default {
  cursor: default !important;
}

.cursor-pointer {
  cursor: pointer !important;
}

.cursor-move {
  cursor: move !important;
}
`;

export default function AdminCalendarDay({ mode = 'view' }: AdminCalendarDayProps) {
  // Состояния
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const timeSlotHeight = 40; // Высота строки комнаты
  
  // Состояния для выделения ячеек
  const [selectionStart, setSelectionStart] = useState<{row: number, col: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{row: number, col: number} | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastHoveredCell, setLastHoveredCell] = useState<{ row: number, col: number } | null>(null);
  
  // Состояние для диалога создания занятия
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLessonData, setNewLessonData] = useState<{
    startTime: string;
    endTime: string;
    roomId: string;
  } | null>(null);
  
  // Состояния для просмотра/редактирования урока
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [lessonDialogMode, setLessonDialogMode] = useState<'view' | 'edit'>('view');
  
  // Рендерим компонент после монтирования для доступа к DOM
  const [mounted, setMounted] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Инъекция стилей при монтировании
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Установка mounted после рендеринга
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Обновление ширины контейнера при изменении размера окна
  useEffect(() => {
    const updateContainerWidth = () => {
      if (tableContainerRef.current) {
        setContainerWidth(tableContainerRef.current.clientWidth);
      }
    };
    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    
    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, []);

  // Создание временных слотов (каждые 15 минут с 8:00 до 22:00)
  const timeSlots = Array.from({ length: 57 }, (_, i) => {
    const hours = Math.floor(i / 4) + 8;
    const startMinutes = (i % 4) * 15;
    
    // Вычисляем конечное время
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

  // Загрузка списка комнат
  useEffect(() => {
    // В реальном приложении здесь будет API запрос
    setRooms(Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 101}`,
      name: `教室 ${i + 101}`
    })));
    setSelectedRooms(Array.from({ length: 15 }, (_, i) => `${i + 101}`));
  }, []);

  // Загрузка занятий
  useEffect(() => {
    // В реальном приложении здесь будет API запрос с учетом выбранной даты и фильтров
    const fakeData: Lesson[] = [
      {
        id: '1',
        subject: 'math',
        teacher: '1',
        student: '1',
        room: '101',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 0),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 15),
        color: getSubjectColor('math')
      },
      {
        id: '2',
        subject: 'physics',
        teacher: '2',
        student: '2',
        room: '102',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 15),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 45),
        color: getSubjectColor('physics')
      },
      {
        id: '3',
        subject: 'english',
        teacher: '3',
        student: '3',
        room: '103',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 30),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 45),
        color: getSubjectColor('english')
      },
      {
        id: '4',
        subject: 'history',
        teacher: '4',
        student: '4',
        room: '104',
        startTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 0),
        endTime: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 14, 0),
        color: getSubjectColor('history')
      },
    ];
    setLessons(fakeData);
  }, [selectedDate, selectedRooms]);

  // Функция обновления линии текущего времени
  const updateTimeLine = useCallback(() => {
    const currentTime = new Date();
    const today = new Date();
    const isSameDay = selectedDate.getDate() === today.getDate() && 
                     selectedDate.getMonth() === today.getMonth() && 
                     selectedDate.getFullYear() === today.getFullYear();
    
    if (tableContainerRef.current && isSameDay) {
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      if (hours >= 8 && hours <= 22) {
        const hourIndex = hours - 8;
        const quarterIndex = Math.floor(minutes / 15);
        const columnIndex = hourIndex * 4 + quarterIndex;
  
        const oldLine = document.querySelector('.current-time-line');
        if (oldLine) {
          oldLine.remove();
        }
    
        const timeCols = document.querySelectorAll('[data-time-col]');
        if (timeCols && timeCols.length > columnIndex) {
          const targetCol = timeCols[columnIndex];
          const rect = targetCol.getBoundingClientRect();
          const containerRect = tableContainerRef.current.getBoundingClientRect();
          const leftOffset = rect.left - containerRect.left + tableContainerRef.current.scrollLeft;
          
          // Создаем линию времени с ограниченной высотой
          const line = document.createElement('div');
          line.className = 'current-time-line absolute border-l-2 border-red-500 z-30';
          line.style.left = `${leftOffset}px`;
          line.style.top = '0'; // Начинается от самого верха контейнера
          line.style.height = `${(selectedRooms.length * timeSlotHeight) + 40}px`; // Ограничиваем высоту линии
          
          // Добавляем маркер времени (красный круг)
          const timeMarker = document.createElement('div');
          timeMarker.className = 'absolute -left-2 top-0 w-4 h-4 rounded-full bg-red-500 z-30';
          line.appendChild(timeMarker);
          
          tableContainerRef.current.appendChild(line);
        }
      }
    }
  }, [selectedDate, tableContainerRef, selectedRooms.length, timeSlotHeight]);

  // Функция для прокрутки к самому раннему уроку дня
  const scrollToEarliestLesson = useCallback(() => {
    if (tableContainerRef.current && lessons.length > 0) {
      // Находим самый ранний урок
      const earliestLesson = lessons.reduce((earliest, current) => {
        return current.startTime < earliest.startTime ? current : earliest;
      }, lessons[0]);
      
      // Получаем время начала самого раннего урока
      const hours = earliestLesson.startTime.getHours();
      const minutes = earliestLesson.startTime.getMinutes();
      
      // Определяем индекс колонки для прокрутки
      const hourIndex = hours - 8;
      const quarterIndex = Math.floor(minutes / 15);
      const columnIndex = hourIndex * 4 + quarterIndex;
      
      // Находим соответствующую колонку времени
      const timeCols = document.querySelectorAll('[data-time-col]');
      if (timeCols && timeCols.length > columnIndex) {
        const targetCol = timeCols[columnIndex];
        const rect = targetCol.getBoundingClientRect();
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const leftOffset = rect.left - containerRect.left;
        
        // Прокручиваем к уроку, с небольшим отступом слева
        tableContainerRef.current.scrollLeft = Math.max(0, leftOffset - 100);
      }
    }
  }, [lessons, tableContainerRef]);
  
  // Отображение текущего времени и прокрутка к текущему уроку
  useEffect(() => {
    // Обновляем линию текущего времени
    setTimeout(updateTimeLine, 100); 
    
    // Затем обновляем каждую минуту
    const interval = setInterval(updateTimeLine, 60000);
    
    // Прокручиваем к самому раннему уроку (или к текущему времени, если уроков нет)
    if (lessons.length > 0) {
      setTimeout(scrollToEarliestLesson, 300);
    } else {
      const currentTime = new Date();
      const today = new Date();
      const isSameDay = selectedDate.getDate() === today.getDate() && 
                      selectedDate.getMonth() === today.getMonth() && 
                      selectedDate.getFullYear() === today.getFullYear();
                      
      if (isSameDay && tableContainerRef.current) {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const hourIndex = hours - 8;
        const quarterIndex = Math.floor(minutes / 15);
        const columnIndex = hourIndex * 4 + quarterIndex;
        
        const timeCols = document.querySelectorAll('[data-time-col]');
        if (timeCols && timeCols.length > columnIndex) {
          const targetCol = timeCols[columnIndex];
          const rect = targetCol.getBoundingClientRect();
          const containerRect = tableContainerRef.current.getBoundingClientRect();
          const leftOffset = rect.left - containerRect.left;
          
          // Прокручиваем к текущему времени
          setTimeout(() => {
            if (tableContainerRef.current) {
              tableContainerRef.current.scrollLeft = Math.max(0, leftOffset - 200);
            }
          }, 300);
        }
      }
    }
    
    return () => clearInterval(interval);
  }, [updateTimeLine, scrollToEarliestLesson, lessons, selectedDate]);

  // УЛУЧШЕННЫЕ ФУНКЦИИ ВЫДЕЛЕНИЯ ЯЧЕЕК
  
  // Функция для запуска выделения
  const startSelection = (roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (mode !== 'create') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsSelecting(true);
    setSelectionStart({ row: roomIndex, col: timeIndex });
    setSelectionEnd({ row: roomIndex, col: timeIndex });
    setLastHoveredCell({ row: roomIndex, col: timeIndex });
    
    // Добавляем класс для стиля курсора
    document.body.classList.add('cursor-move');
  };

  // Обработчик движения мыши для плавного выделения
  const handleCellHover = (roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Обновляем только если ячейка изменилась
    if (!lastHoveredCell || lastHoveredCell.row !== roomIndex || lastHoveredCell.col !== timeIndex) {
      setLastHoveredCell({ row: roomIndex, col: timeIndex });
      
      // Используем только начальную комнату
      setSelectionEnd({ row: selectionStart.row, col: timeIndex });
    }
  };

  // Функция для завершения выделения и обработки результата
  const finishSelection = () => {
    if (!selectionStart || !selectionEnd) {
      cancelSelection();
      return;
    }
    
    setIsSelecting(false);
    document.body.classList.remove('cursor-move');
    
    // Проверяем, есть ли реальное выделение (не просто клик)
    const isValidSelection = Math.abs(selectionEnd.col - selectionStart.col) > 0;
    
    if (isValidSelection) {
      console.log('Обработка выделения...');
      console.log('selectionStart:', selectionStart);
      console.log('selectionEnd:', selectionEnd);
      
      const startTimeIndex = Math.min(selectionStart.col, selectionEnd.col);
      const endTimeIndex = Math.max(selectionStart.col, selectionEnd.col);
      const roomIndex = selectionStart.row; // Используем только начальную комнату
      
      // Проверка границ
      if (startTimeIndex >= 0 && startTimeIndex < timeSlots.length && 
          endTimeIndex >= 0 && endTimeIndex < timeSlots.length) {
        const startTime = timeSlots[startTimeIndex].start;
        const endTime = timeSlots[endTimeIndex].end;
        const roomId = selectedRooms[roomIndex];

        console.log('Создание нового урока:');
        console.log('- Комната:', roomId, '(индекс:', roomIndex, ')');
        console.log('- Время:', startTime, '-', endTime);
        
        // Сохраняем данные для нового урока
        const newData = {
          startTime,
          endTime,
          roomId
        };
        
        // Очищаем выделение перед открытием диалога
        setSelectionStart(null);
        setSelectionEnd(null);
        setIsSelecting(false);
        setLastHoveredCell(null);
        
        // Устанавливаем данные и открываем диалог
        setNewLessonData(newData);
        setTimeout(() => {
          setShowCreateDialog(true);
        }, 50);
        
        return; // Важно: прерываем выполнение, чтобы избежать вызова cancelSelection()
      }
    }
    
    // Если выделения нет, или оно невалидное, просто отменяем
    cancelSelection();
  };

  // Функция для отмены выделения
  const cancelSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    setLastHoveredCell(null);
    document.body.classList.remove('cursor-move');
  };

  // Обработчик для правой кнопки мыши (отмена выделения)
  const handleRightClick = (e: React.MouseEvent) => {
    if (selectionStart || isSelecting) {
      e.preventDefault();
      cancelSelection();
    }
  };

  // Обработчик для глобальных событий мыши
  useEffect(() => {
    // Функция для обработки отпускания кнопки мыши в любом месте документа
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isSelecting && selectionStart && selectionEnd) {
        e.preventDefault();
        console.log('Глобальный mouseUp: завершение выделения');
        finishSelection();
      }
    };
  
    // Функция для обработки правой кнопки мыши для отмены выделения
    const handleGlobalRightClick = (e: MouseEvent) => {
      if (isSelecting || selectionStart) {
        e.preventDefault();
        console.log('Правый клик: отмена выделения');
        cancelSelection();
      }
    };
  
    // Добавляем обработчики событий
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('contextmenu', handleGlobalRightClick);
  
    // Удаляем обработчики при размонтировании
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('contextmenu', handleGlobalRightClick);
      document.body.classList.remove('cursor-move');
    };
  }, [isSelecting, selectionStart, selectionEnd]);

  // Определение, выбрана ли ячейка
  const isCellSelected = (roomIndex: number, timeIndex: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    return roomIndex === selectionStart.row && timeIndex >= minCol && timeIndex <= maxCol;
  };

  // Определение, подсвечивается ли строка
  const isRowHighlighted = (roomIndex: number) => {
    return mode === 'create' && selectionStart && roomIndex === selectionStart.row;
  };

  // Функция для форматирования даты
  const formatDate = (date: Date) => {
    return format(date, 'yyyy年MM月dd日', { locale: ja });
  };

  // Функции для навигации по датам
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

  // Обработчики для диалогов уроков
  const handleSaveLesson = (updatedLesson: Lesson) => {
    setLessons(prevLessons => 
      prevLessons.map(lesson => 
        lesson.id === updatedLesson.id ? updatedLesson : lesson
      )
    );
    setShowLessonDialog(false);
  };

  const handleDeleteLesson = (lessonId: string) => {
    setLessons(prevLessons => 
      prevLessons.filter(lesson => lesson.id !== lessonId)
    );
    
    // В реальном приложении здесь будет API запрос для удаления
    setShowLessonDialog(false);
  };
  
  // Обработчик для сохранения нового урока
  const handleSaveNewLesson = (newLessonData: any) => {
    // Проверяем наличие необходимых данных
    if (!newLessonData || !newLessonData.subject || !newLessonData.startTime || !newLessonData.endTime) {
      console.error('Недостаточно данных для создания урока', newLessonData);
      return;
    }

    console.log('handleSaveNewLesson - данные урока:', newLessonData);
    
    // Получаем цвет для выбранного предмета
    const color = getSubjectColor(newLessonData.subject);
    
    // Создание объекта нового урока
    const newLesson: Lesson = {
      id: `temp-${Date.now()}`, // Временный ID, в реальном приложении будет с сервера
      subject: newLessonData.subject,
      teacher: newLessonData.teacher || 'Не указан',
      student: newLessonData.student || 'Не указан',
      room: newLessonData.room, // Используем room из данных нового урока
      startTime: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        typeof newLessonData.startTime === 'string' 
          ? parseInt(newLessonData.startTime.split(':')[0]) 
          : newLessonData.startTime.getHours(),
        typeof newLessonData.startTime === 'string'
          ? parseInt(newLessonData.startTime.split(':')[1])
          : newLessonData.startTime.getMinutes()
      ),
      endTime: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        typeof newLessonData.endTime === 'string'
          ? parseInt(newLessonData.endTime.split(':')[0])
          : newLessonData.endTime.getHours(),
        typeof newLessonData.endTime === 'string'
          ? parseInt(newLessonData.endTime.split(':')[1])
          : newLessonData.endTime.getMinutes()
      ),
      color: color // Используем полученный цвет на основе предмета
    };
    
    console.log(`Создан новый урок: Предмет=${newLesson.subject}, Комната=${newLesson.room}, Цвет=${color}`);
    
    // Добавляем новый урок в список
    const newLessonsArray = [...lessons, newLesson];
    console.log('Массив уроков после добавления:', newLessonsArray);
    setLessons(newLessonsArray);
    
    // В реальном приложении здесь был бы API-запрос
    setShowCreateDialog(false);
  };

  // Обработчик клика по карточке урока
  const handleLessonCardClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLessonDialogMode('view');
    setShowLessonDialog(true);
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
          className="relative overflow-hidden" 
          style={{ 
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto', 
            overflowX: 'auto',
            position: 'relative' 
          }} 
          ref={tableContainerRef}
        >
          <div 
            className="relative w-full" 
            data-time-grid-container 
            style={{ 
              minWidth: `${Math.max(timeSlots.length * 40, containerWidth)}px`,
              height: `${selectedRooms.length * timeSlotHeight + 40}px`, // Высота заголовка плюс высота комнат
            }}
          >
            {/* Заголовок с временными интервалами */}
            <div className="sticky top-0 flex z-40 bg-card shadow">
              <div className="w-[100px] min-w-[100px] flex items-center justify-center font-semibold border-b border-r">
                教室
              </div>
              {timeSlots.map((timeSlot) => (
                <div 
                  key={timeSlot.start}
                  data-time-col
                  data-time-index={timeSlot.index}
                  className={`w-[40px] min-w-[40px] flex items-center justify-center font-semibold border-b border-r
                    ${timeSlot.index % 4 === 0 ? "bg-gray-50" : ""}`}
                >
                  {timeSlot.index % 4 === 0 ? (
                    <div className="text-xs font-medium">
                      {timeSlot.start.split(':')[0]}:00
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            
            {/* Строки комнат */}
            <div className="relative z-10">
              {selectedRooms.map((roomId, roomIndex) => (
                <div 
                  key={roomId}
                  className="flex relative"
                  style={{ height: `${timeSlotHeight}px` }}
                >
                  {/* Ячейка комнаты */}
                  <div 
                    className="sticky left-0 w-[100px] min-w-[100px] flex items-center justify-center bg-card z-30 border-r border-b"
                  >
                    <span className="z-50">教室 {roomId}</span>
                  </div>
                  
                  {/* Ячейки времени для этой комнаты */}
                  {timeSlots.map((timeSlot, timeIndex) => (
                    <div 
                      key={`${roomId}-${timeSlot.start}`}
                      data-time-index={timeSlot.index}
                      className={`w-[40px] min-w-[40px] border-r border-b
                        ${timeSlot.index % 4 === 0 ? "bg-gray-50" : ""}
                        ${isCellSelected(roomIndex, timeIndex) ? "bg-green-100" : ""}
                        ${isRowHighlighted(roomIndex) && !isCellSelected(roomIndex, timeIndex) ? "bg-blue-50" : ""}
                        ${mode === 'create' ? "cursor-default" : ""}
                        ${isSelecting ? "cursor-move" : ""}`}
                      onMouseDown={(e) => {
                        if (mode === 'create') {
                          startSelection(roomIndex, timeIndex, e);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (mode === 'create' && isSelecting) {
                          handleCellHover(roomIndex, timeIndex, e);
                        }
                      }}
                      onContextMenu={handleRightClick}
                    />
                  ))}
                </div>
              ))}
            </div>
            
            {/* Слой для уроков - отображаем только если компонент смонтирован */}
            {mounted && (
              <div className="absolute top-0 left-0 w-full h-full pointer-events-auto">
                {lessons.map(lesson => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    selectedRooms={selectedRooms}
                    onClick={handleLessonCardClick}
                    timeSlotHeight={timeSlotHeight}
                    timeSlots={timeSlots}
                  />
                ))}
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

      {/* Используем компонент CreateLessonDialog */}
      <CreateLessonDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        lessonData={newLessonData}
        selectedDate={selectedDate}
        selectedRooms={selectedRooms}
        onSave={handleSaveNewLesson}
      />
      
      {/* Используем компонент EditLessonDialog */}
      <EditLessonDialog
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