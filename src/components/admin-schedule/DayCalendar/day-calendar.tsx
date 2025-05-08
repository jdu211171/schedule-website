import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ClassSession } from '@/hooks/useScheduleClassSessions'; 
import { SelectionPosition } from './admin-calendar-day'; 
import { LessonCard } from './lesson-card'; 

export type TimeSlot = {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
};

interface Room {
  boothId: string;
  name: string;
}

type DayCalendarProps = {
  date: Date;
  rooms: Room[];
  timeSlots: TimeSlot[];
  classSessions: ClassSession[];
  onLessonClick: (lesson: ClassSession) => void;
  onCreateLesson: (date: Date, startTime: string, endTime: string, roomId: string) => void;
  resetSelectionKey?: number;
};

// Константы вынесены за пределы компонента
const CELL_WIDTH = 40; 
const ROOM_LABEL_WIDTH = 100; 
const TIME_SLOT_HEIGHT = 40;

// Чистая функция для проверки выделения
const isCellInSelection = (roomIndex: number, timeIndex: number, selectionStart: SelectionPosition | null, selectionEnd: SelectionPosition | null): boolean => {
  if (!selectionStart || !selectionEnd) return false;
  
  if (roomIndex !== selectionStart.row) return false;
  
  const minCol = Math.min(selectionStart.col, selectionEnd.col);
  const maxCol = Math.max(selectionStart.col, selectionEnd.col);
  
  return timeIndex >= minCol && timeIndex <= maxCol;
};

// Компонент ячейки календаря
const CalendarCell = React.memo(({ 
  roomIndex, 
  timeSlot, 
  isSelected,
  isSelecting,
  onMouseDown,
  onMouseEnter,
  onMouseUp 
}: { 
  roomIndex: number, 
  timeSlot: TimeSlot, 
  isSelected: boolean,
  isSelecting: boolean,
  onMouseDown: (e: React.MouseEvent) => void,
  onMouseEnter: (e: React.MouseEvent) => void,
  onMouseUp: (e: React.MouseEvent) => void
}) => {
  const cellKey = `cell-${roomIndex}-${timeSlot.index}`;
  
  return (
    <div
      key={cellKey}
      id={cellKey}
      data-room-index={roomIndex}
      data-time-index={timeSlot.index}
      data-start-time={timeSlot.start}
      data-selected={isSelected ? "true" : "false"}
      className={`
        border-r border-b relative select-none
        ${timeSlot.index % 4 === 0 ? "bg-gray-50" : "bg-white"}
        ${isSelecting ? "cursor-move" : "hover:bg-gray-100 cursor-pointer"}
        ${isSelected ? "!bg-green-200 !opacity-80 shadow-inner" : ""}
      `}
      style={{ 
        width: `${CELL_WIDTH}px`, 
        minWidth: `${CELL_WIDTH}px`,
        height: `${TIME_SLOT_HEIGHT}px`,
        transition: 'background-color 0.05s ease-in-out, opacity 0.05s ease-in-out'
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
    />
  );
});

CalendarCell.displayName = 'CalendarCell';

// Компонент строки календаря
const RoomRow = React.memo(({ 
  room, 
  roomIndex, 
  timeSlots,
  selectionStart,
  selectionEnd,
  isSelecting,
  onStartSelection,
  onCellHover,
  onEndSelection
}: { 
  room: Room, 
  roomIndex: number, 
  timeSlots: TimeSlot[],
  selectionStart: SelectionPosition | null,
  selectionEnd: SelectionPosition | null,
  isSelecting: boolean,
  onStartSelection: (roomIndex: number, timeIndex: number, e: React.MouseEvent) => void,
  onCellHover: (roomIndex: number, timeIndex: number, e: React.MouseEvent) => void,
  onEndSelection: (e: React.MouseEvent) => void
}) => {
  return (
    <div
      className="flex relative"
      style={{ height: `${TIME_SLOT_HEIGHT}px` }}
    >
      {/* Метка комнаты */}
      <div
        className="sticky left-0 flex items-center justify-center bg-white z-10 border-r border-b text-sm font-medium text-gray-700 px-2"
        style={{ 
          width: `${ROOM_LABEL_WIDTH}px`, 
          minWidth: `${ROOM_LABEL_WIDTH}px`, 
          height: `${TIME_SLOT_HEIGHT}px` 
        }}
      >
        <span className="truncate">{room.name}</span>
      </div>

      {/* Ячейки времени для этой комнаты */}
      {timeSlots.map((timeSlot) => {
        const isSelected = isCellInSelection(roomIndex, timeSlot.index, selectionStart, selectionEnd);
        
        return (
          <CalendarCell
            key={`cell-${roomIndex}-${timeSlot.index}`}
            roomIndex={roomIndex}
            timeSlot={timeSlot}
            isSelected={isSelected}
            isSelecting={isSelecting}
            onMouseDown={(e) => onStartSelection(roomIndex, timeSlot.index, e)}
            onMouseEnter={(e) => onCellHover(roomIndex, timeSlot.index, e)}
            onMouseUp={onEndSelection}
          />
        );
      })}
    </div>
  );
});

RoomRow.displayName = 'RoomRow';

// Компонент заголовка с временными слотами
const TimeHeader = React.memo(({ timeSlots }: { timeSlots: TimeSlot[] }) => {
  return (
    <div className="sticky top-0 flex z-20 bg-white shadow-sm border-b">
      <div 
        className="sticky left-0 flex items-center justify-center font-semibold border-r text-sm text-gray-700 bg-white z-30"
        style={{ width: `${ROOM_LABEL_WIDTH}px`, minWidth: `${ROOM_LABEL_WIDTH}px`, height: `${TIME_SLOT_HEIGHT}px` }}
      >
        教室
      </div>
      {timeSlots.map((timeSlot) => (
        <div
          key={`time-${timeSlot.index}`}
          data-time-index={timeSlot.index}
          className={`flex items-center justify-center font-semibold border-r text-xs
            ${timeSlot.index % 4 === 0 ? "bg-gray-100" : "bg-white"}`}
          style={{ 
            width: `${CELL_WIDTH}px`, 
            minWidth: `${CELL_WIDTH}px`, 
            height: `${TIME_SLOT_HEIGHT}px`
          }}
        >
          {timeSlot.index % 4 === 0 ? (
            <div className="text-xs font-medium text-gray-600">
              {timeSlot.start.split(':')[0]}:00
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
});

TimeHeader.displayName = 'TimeHeader';

// Основной компонент календаря
const DayCalendarComponent: React.FC<DayCalendarProps> = ({
  date,
  rooms,
  timeSlots,
  classSessions,
  onLessonClick,
  onCreateLesson,
  resetSelectionKey = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200); 
  
  const [selectionStart, setSelectionStart] = useState<SelectionPosition | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<SelectionPosition | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Ref для отслеживания, был ли вызван onCreateLesson
  const createLessonCalledRef = useRef(false);
  
  // Функция отмены выделения
  const cancelSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    document.body.classList.remove('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  // Сброс выделения при изменении resetSelectionKey
  useEffect(() => {
    if (resetSelectionKey > 0) {
      cancelSelection();
    }
  }, [resetSelectionKey, cancelSelection]);

  // Начало выделения
  const handleStartSelection = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    
    const start = { row: roomIndex, col: timeIndex };
    
    setIsSelecting(true);
    setSelectionStart(start);
    setSelectionEnd(start);
    document.body.classList.add('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  // Обновление при перемещении мыши
  const handleCellHover = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return;
    e.preventDefault();
    
    // Если мы перемещаемся в той же строке, что и начало выделения
    if (roomIndex === selectionStart.row) {
      const end = { row: roomIndex, col: timeIndex };
      setSelectionEnd(end);
    }
  }, [isSelecting, selectionStart]);

  // Завершение выделения - ОСНОВНОЕ МЕСТО ОПТИМИЗАЦИИ
  const handleEndSelection = useCallback((e: React.MouseEvent) => {
    if (isSelecting && selectionStart && selectionEnd && !createLessonCalledRef.current) {
      e.preventDefault();
      
      const startCol = Math.min(selectionStart.col, selectionEnd.col);
      const endCol = Math.max(selectionStart.col, selectionEnd.col);
      const roomIndex = selectionStart.row;
      
      // Проверка, что выделение действительно имеет диапазон
      const isValidSelection = endCol > startCol; 
      if (isValidSelection) {
        if (startCol >= 0 && startCol < timeSlots.length &&
            endCol >= 0 && endCol < timeSlots.length &&
            roomIndex >= 0 && roomIndex < rooms.length) {

          const startTime = timeSlots[startCol].start;
          const endTime = timeSlots[endCol].end; 
          const selectedRoomId = rooms[roomIndex].boothId;

          // Устанавливаем флаг, что onCreateLesson был вызван
          createLessonCalledRef.current = true;
          
          // ВАЖНО: немедленно вызываем onCreateLesson без сброса состояния выделения
          // Это устраняет задержку между завершением drag и открытием модального окна
          onCreateLesson(date, startTime, endTime, selectedRoomId);
          
          // Сохраняем текущий вид выделения, пока диалог не откроется
          // cancelSelection будет вызван через resetSelectionKey из родительского компонента
          return;
        }
      }
      
      // Если выделение не валидно, просто отменяем его
      cancelSelection();
    }
  }, [isSelecting, selectionStart, selectionEnd, timeSlots, rooms, onCreateLesson, date, cancelSelection]); 

  // Обработка изменения размера контейнера
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    updateContainerWidth();
    
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Глобальные обработчики событий
  useEffect(() => {
    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (isSelecting && !createLessonCalledRef.current) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          cancelSelection();
        } else if (!(event.target as HTMLElement)?.closest(`[data-room-index][data-time-index]`)) {
          cancelSelection();
        }
      }
    };
    
    const handleGlobalRightClick = (e: MouseEvent) => {
      if (isSelecting) {
        e.preventDefault();
        cancelSelection();
      }
    };
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelecting) {
        cancelSelection();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('contextmenu', handleGlobalRightClick);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('contextmenu', handleGlobalRightClick);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.classList.remove('cursor-move');
    };
  }, [isSelecting, cancelSelection]);

  // Фильтрация сессий для текущей даты
  const filteredSessions = useMemo(() => {
    const calendarDateStr = date.toISOString().split('T')[0];
    return classSessions.filter(session => {
      const sessionDateStr = session.date.split('T')[0];
      return sessionDateStr === calendarDateStr;
    });
  }, [classSessions, date]);

  // Форматирование даты
  const formattedDate = useMemo(() => {
    return format(date, 'yyyy年MM月dd日 (eee)', { locale: ja });
  }, [date]);

  // Вычисление общей ширины сетки
  const totalGridWidth = useMemo(() => {
    return timeSlots.length * CELL_WIDTH;
  }, [timeSlots.length]);

  return (
    <div className="border rounded-md overflow-hidden shadow-sm bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-medium text-lg">{formattedDate}</h3>
      </div>

      <div
        className="relative overflow-auto"
        style={{ maxHeight: '500px' }}
        ref={containerRef}
      >
        <div
          className="relative min-w-full select-none"
          style={{
            minWidth: `${Math.max(totalGridWidth + ROOM_LABEL_WIDTH, containerWidth)}px`,
            height: `${(rooms.length + 1) * TIME_SLOT_HEIGHT}px`
          }}
        >
          {/* Заголовок с временными слотами */}
          <TimeHeader timeSlots={timeSlots} />

          {/* Комнаты и их ячейки времени */}
          <div className="relative z-10">
            {rooms.map((room, roomIndex) => (
              <RoomRow
                key={`room-${room.boothId || roomIndex}`}
                room={room}
                roomIndex={roomIndex}
                timeSlots={timeSlots}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                isSelecting={isSelecting}
                onStartSelection={handleStartSelection}
                onCellHover={handleCellHover}
                onEndSelection={handleEndSelection}
              />
            ))}
          </div>

          {/* Слой для отображения карточек уроков */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
            {filteredSessions.map(session => (
              <LessonCard
                key={`lesson-${session.classId}`}
                lesson={session}
                rooms={rooms}
                onClick={onLessonClick}
                timeSlotHeight={TIME_SLOT_HEIGHT}
                timeSlots={timeSlots}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

DayCalendarComponent.displayName = 'DayCalendar';

export const DayCalendar = React.memo(DayCalendarComponent);