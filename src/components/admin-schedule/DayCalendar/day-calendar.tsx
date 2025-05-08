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
  rooms: Room[]; // Уточненный тип для комнат
  timeSlots: TimeSlot[];
  classSessions: ClassSession[];
  onLessonClick: (lesson: ClassSession) => void;
  onCreateLesson: (date: Date, startTime: string, endTime: string, roomId: string) => void;
  resetSelectionKey?: number;
};

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
  const timeSlotHeight = 40; 

  const [selectionStart, setSelectionStart] = useState<SelectionPosition | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<SelectionPosition | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const cancelSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    document.body.classList.remove('cursor-move');
  }, []);

  useEffect(() => {
    if (resetSelectionKey > 0) {
      cancelSelection();
    }
  }, [resetSelectionKey, cancelSelection]);

  const handleStartSelection = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionStart({ row: roomIndex, col: timeIndex });
    setSelectionEnd({ row: roomIndex, col: timeIndex });
    document.body.classList.add('cursor-move');
  }, []);

  const handleCellHover = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return;
    e.preventDefault();
    if (roomIndex === selectionStart.row) {
      setSelectionEnd({ row: selectionStart.row, col: timeIndex });
    }
  }, [isSelecting, selectionStart]);

  const handleEndSelection = useCallback((e: React.MouseEvent) => {
    if (isSelecting && selectionStart && selectionEnd) {
      e.preventDefault();
      setIsSelecting(false);
      document.body.classList.remove('cursor-move');

      const startCol = Math.min(selectionStart.col, selectionEnd.col);
      const endCol = Math.max(selectionStart.col, selectionEnd.col);
      const roomIndex = selectionStart.row;

      const isValidSelection = endCol > startCol; 
      if (isValidSelection) {
        if (startCol >= 0 && startCol < timeSlots.length &&
            endCol >= 0 && endCol < timeSlots.length &&
            roomIndex >= 0 && roomIndex < rooms.length) {

          const startTime = timeSlots[startCol].start;
          const endTime = timeSlots[endCol].end; 
          const selectedRoomId = rooms[roomIndex].boothId;

          onCreateLesson(date, startTime, endTime, selectedRoomId);
          // Сброс выделения не нужен здесь, так как isSelecting уже false,
          // и selectionStart/End будут сброшены при следующем взаимодействии или через resetSelectionKey.
          return; 
        }
      }
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [isSelecting, selectionStart, selectionEnd, timeSlots, rooms, onCreateLesson, date]); 

  const isCellSelected = useCallback((roomIndex: number, timeIndex: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    return roomIndex === selectionStart.row && timeIndex >= minCol && timeIndex <= maxCol;
  }, [selectionStart, selectionEnd]);

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

  useEffect(() => {
    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (isSelecting) {
        // Этот обработчик срабатывает, если кнопка мыши была отпущена ВНЕ ячеек календаря,
        // где есть свой onMouseUp. Если это произошло, отменяем выделение.
        // Проверяем, чтобы цель события не была внутри самого календаря, чтобы не дублировать логику.
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
             cancelSelection();
        } else if (! (event.target as HTMLElement)?.closest(`[data-room-index][data-time-index]`)) {
            // Если отпускание не на ячейке, также отменяем
            cancelSelection();
        }
        // Если отпускание на ячейке, handleEndSelection на ячейке должен был сработать.
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

  const filteredSessions = useMemo(() => {
    const calendarDateStr = date.toISOString().split('T')[0];
    return classSessions.filter(session => {
      const sessionDateStr = session.date.split('T')[0];
      return sessionDateStr === calendarDateStr;
    });
  }, [classSessions, date]);

  const formattedDate = useMemo(() => {
    return format(date, 'yyyy年MM月dd日 (eee)', { locale: ja });
  }, [date]);

  const cellWidth = 40;
  const totalGridWidth = timeSlots.length * cellWidth;
  const roomLabelWidth = 100;

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
          className="relative w-full"
          style={{
            minWidth: `${Math.max(totalGridWidth + roomLabelWidth, containerWidth)}px`,
            height: `${rooms.length * timeSlotHeight + timeSlotHeight}px`
          }}
          onMouseLeave={() => {
            // Отмена выделения, если мышь покинула область сетки во время выделения
            // Может быть слишком агрессивным, нужно тестировать UX
            // if (isSelecting) {
            //   cancelSelection();
            // }
          }}
        >
          {/* Заголовок с временными слотами */}
          <div className="sticky top-0 flex z-20 bg-white shadow-sm">
            <div className="w-[100px] min-w-[100px] flex items-center justify-center font-semibold border-b border-r text-sm text-gray-700">
              教室
            </div>
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot.start}
                data-time-col
                data-time-index={timeSlot.index}
                className={`w-[${cellWidth}px] min-w-[${cellWidth}px] h-[${timeSlotHeight}px] flex items-center justify-center font-semibold border-b border-r text-xs
                  ${timeSlot.index % 4 === 0 ? "bg-gray-100" : "bg-white"}`}
              >
                {timeSlot.index % 4 === 0 ? (
                  <div className="text-xs font-medium text-gray-600">
                    {timeSlot.start.split(':')[0]}:00
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Комнаты и их ячейки времени */}
          <div className="relative z-10">
            {rooms.map((room, roomIndex) => (
              <div
                key={room.boothId || `room-${roomIndex}`}
                className="flex relative"
                style={{ height: `${timeSlotHeight}px` }}
              >
                {/* Метка комнаты */}
                <div
                  className="sticky left-0 w-[100px] min-w-[100px] flex items-center justify-center bg-white z-10 border-r border-b text-sm font-medium text-gray-700 px-2 text-center"
                >
                  <span className="truncate">{room.name}</span>
                </div>

                {/* Ячейки времени для этой комнаты */}
                {timeSlots.map((timeSlot, timeIndex) => (
                  <div
                    key={`${room.boothId || `room-${roomIndex}`}-${timeSlot.start}`}
                    data-room-index={roomIndex}
                    data-time-index={timeIndex}
                    className={`w-[${cellWidth}px] min-w-[${cellWidth}px] border-r border-b relative
                      ${timeSlot.index % 4 === 0 ? "bg-gray-50" : "bg-white"}
                      ${isCellSelected(roomIndex, timeIndex) ? "bg-green-200 opacity-70" : ""}
                      ${isSelecting ? "cursor-move" : "hover:bg-gray-100 cursor-pointer"}`}
                    onMouseDown={(e) => {
                      handleStartSelection(roomIndex, timeIndex, e);
                    }}
                    onMouseEnter={(e) => {
                      handleCellHover(roomIndex, timeIndex, e);
                    }}
                    onMouseUp={(e) => { 
                        handleEndSelection(e);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Слой для отображения карточек уроков */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
            {filteredSessions.map(session => (
              <LessonCard
                key={session.classId}
                lesson={session}
                rooms={rooms}
                onClick={onLessonClick}
                timeSlotHeight={timeSlotHeight}
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
