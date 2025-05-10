import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ClassSessionWithRelations } from '@/hooks/useClassSessionQuery'; 
import { SelectionPosition, TimeSlot } from './admin-calendar-day'; 
import { LessonCard } from './lesson-card'; 

interface Room {
  boothId: string;
  name: string;
}

type DayCalendarProps = {
  date: Date;
  rooms: Room[];
  timeSlots: TimeSlot[];
  classSessions: ClassSessionWithRelations[];
  onLessonClick: (lesson: ClassSessionWithRelations) => void;
  onCreateLesson: (date: Date, startTime: string, endTime: string, roomId: string) => void;
  resetSelectionKey?: number;
};

const CELL_WIDTH = 40; 
const ROOM_LABEL_WIDTH = 100; 
const TIME_SLOT_HEIGHT = 40;

const isSameDay = (date1: string | Date, date2: string | Date): boolean => {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isCellInSelection = (roomIndex: number, timeIndex: number, selectionStart: SelectionPosition | null, selectionEnd: SelectionPosition | null): boolean => {
  if (!selectionStart || !selectionEnd) return false;
  
  if (roomIndex !== selectionStart.row) return false;
  
  const minCol = Math.min(selectionStart.col, selectionEnd.col);
  const maxCol = Math.max(selectionStart.col, selectionEnd.col);
  
  return timeIndex >= minCol && timeIndex <= maxCol;
};

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
  
  const createLessonCalledRef = useRef(false);
  
  // DEBUG: Логируем, сколько сессий у нас для этого дня
  useEffect(() => {
    console.log(`DayCalendar for ${date.toISOString().substring(0, 10)} has ${classSessions.length} sessions`);
  }, [date, classSessions]);
  
  const cancelSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    document.body.classList.remove('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  useEffect(() => {
    if (resetSelectionKey > 0) {
      cancelSelection();
    }
  }, [resetSelectionKey, cancelSelection]);

  const handleStartSelection = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    
    const start = { row: roomIndex, col: timeIndex };
    
    setIsSelecting(true);
    setSelectionStart(start);
    setSelectionEnd(start);
    document.body.classList.add('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  const handleCellHover = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return;
    e.preventDefault();
    
    if (roomIndex === selectionStart.row) {
      const end = { row: roomIndex, col: timeIndex };
      setSelectionEnd(end);
    }
  }, [isSelecting, selectionStart]);

  const handleEndSelection = useCallback((e: React.MouseEvent) => {
    if (isSelecting && selectionStart && selectionEnd && !createLessonCalledRef.current) {
      e.preventDefault();
      
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

          createLessonCalledRef.current = true;
          
          onCreateLesson(date, startTime, endTime, selectedRoomId);
          
          return;
        }
      }
      
      cancelSelection();
    }
  }, [isSelecting, selectionStart, selectionEnd, timeSlots, rooms, onCreateLesson, date, cancelSelection]); 

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
      if (isSelecting && !createLessonCalledRef.current) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          cancelSelection();
        } else if (!(event.target as HTMLElement)?.closest('[data-room-index][data-time-index]')) {
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

  const filteredSessions = useMemo(() => {
    return classSessions.filter(session => {
      return isSameDay(session.date, date);
    });
  }, [classSessions, date]);

  const formattedDate = useMemo(() => {
    return format(date, 'yyyy年MM月dd日 (eee)', { locale: ja });
  }, [date]);

  const totalGridWidth = useMemo(() => {
    return timeSlots.length * CELL_WIDTH;
  }, [timeSlots.length]);

  return (
    <div className="border rounded-md overflow-hidden shadow-sm bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-medium text-lg">{formattedDate}</h3>
        {filteredSessions.length === 0 && (
          <div className="text-xs text-gray-500 mt-1">
            この日の授業はまだありません
          </div>
        )}
        {filteredSessions.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            授業数: {filteredSessions.length}
          </div>
        )}
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
          <TimeHeader timeSlots={timeSlots} />

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