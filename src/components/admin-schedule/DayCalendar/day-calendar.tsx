import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ClassSessionWithRelations } from '@/hooks/useClassSessionQuery'; 
import { SelectionPosition, TimeSlot } from './admin-calendar-day'; 
import { LessonCard } from './lesson-card'; 
import { isSameDay } from '../date';

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

interface SelectionState {
  isSelecting: boolean;
  start: SelectionPosition | null;
  end: SelectionPosition | null;
}

const initialSelectionState: SelectionState = {
  isSelecting: false,
  start: null,
  end: null
};

const isCellInSelection = (
  roomIndex: number, 
  timeIndex: number, 
  selectionStart: SelectionPosition | null, 
  selectionEnd: SelectionPosition | null
): boolean => {
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
        ${timeSlot.index % 4 === 0 
          ? "bg-muted dark:bg-muted" 
          : "bg-background dark:bg-background"
        }
        ${isSelecting 
          ? "cursor-move" 
          : "hover:bg-accent dark:hover:bg-accent cursor-pointer"
        }
        ${isSelected 
          ? "!bg-green-200 dark:!bg-green-900 !opacity-80 shadow-inner" 
          : ""
        }
        border-border dark:border-border
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
}, (prevProps, nextProps) => {
  return prevProps.roomIndex === nextProps.roomIndex &&
         prevProps.timeSlot.index === nextProps.timeSlot.index &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isSelecting === nextProps.isSelecting;
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
        className="flex items-center justify-center bg-background dark:bg-background border-r border-b text-sm font-medium text-foreground dark:text-foreground px-2 border-border dark:border-border"
        style={{ 
          width: `${ROOM_LABEL_WIDTH}px`, 
          minWidth: `${ROOM_LABEL_WIDTH}px`, 
          height: `${TIME_SLOT_HEIGHT}px`,
          zIndex: 5
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
}, (prevProps, nextProps) => {
  return prevProps.roomIndex === nextProps.roomIndex &&
         prevProps.room.boothId === nextProps.room.boothId &&
         prevProps.isSelecting === nextProps.isSelecting &&
         prevProps.selectionStart === nextProps.selectionStart &&
         prevProps.selectionEnd === nextProps.selectionEnd;
});

RoomRow.displayName = 'RoomRow';

const TimeHeader = React.memo(({ timeSlots }: { timeSlots: TimeSlot[] }) => {
  return (
    <div className="flex bg-background dark:bg-background shadow-sm border-b border-border dark:border-border">
      <div 
        className="flex items-center justify-center font-semibold border-r text-sm text-foreground dark:text-foreground bg-background dark:bg-background border-border dark:border-border"
        style={{ 
          width: `${ROOM_LABEL_WIDTH}px`, 
          minWidth: `${ROOM_LABEL_WIDTH}px`, 
          height: `${TIME_SLOT_HEIGHT}px`,
          zIndex: 5
        }}
      >
        教室
      </div>
      {timeSlots.map((timeSlot) => (
        <div
          key={`time-${timeSlot.index}`}
          data-time-index={timeSlot.index}
          className={`flex items-center justify-center font-semibold border-r text-xs border-border dark:border-border
            ${timeSlot.index % 4 === 0 
              ? "bg-muted dark:bg-muted" 
              : "bg-background dark:bg-background"
            }`}
          style={{ 
            width: `${CELL_WIDTH}px`, 
            minWidth: `${CELL_WIDTH}px`, 
            height: `${TIME_SLOT_HEIGHT}px`
          }}
        >
          {timeSlot.index % 4 === 0 ? (
            <div className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
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
  
  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);
  
  const createLessonCalledRef = useRef(false);
  const lastResizeTime = useRef(0);

  const filteredSessions = useMemo(() => {
    return classSessions.filter(session => isSameDay(session.date, date));
  }, [classSessions, date]);
  
  const totalGridWidth = useMemo(() => {
    return timeSlots.length * CELL_WIDTH;
  }, [timeSlots.length]);
  
  const formattedDate = useMemo(() => {
    return format(date, 'yyyy年MM月dd日 (eee)', { locale: ja });
  }, [date]);
  
  useEffect(() => {
    console.log(`DayCalendar for ${date.toISOString().substring(0, 10)} has ${filteredSessions.length} sessions`);
  }, [date, filteredSessions.length]);
  
  const cancelSelection = useCallback(() => {
    setSelection(initialSelectionState);
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
    
    setSelection({
      isSelecting: true,
      start: start,
      end: start
    });
    document.body.classList.add('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  const handleCellHover = useCallback((roomIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (!selection.isSelecting || !selection.start) return;
    e.preventDefault();
    
    if (roomIndex === selection.start.row) {
      setSelection(prev => ({
        ...prev,
        end: { row: roomIndex, col: timeIndex }
      }));
    }
  }, [selection.isSelecting, selection.start]);

  const handleEndSelection = useCallback((e: React.MouseEvent) => {
    if (selection.isSelecting && selection.start && selection.end && !createLessonCalledRef.current) {
      e.preventDefault();
      
      const startCol = Math.min(selection.start.col, selection.end.col);
      const endCol = Math.max(selection.start.col, selection.end.col);
      const roomIndex = selection.start.row;
      
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
  }, [selection, timeSlots, rooms, onCreateLesson, date, cancelSelection]); 

  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateContainerWidth();
    
    const resizeObserver = new ResizeObserver(() => {
      const now = Date.now();
      if (now - lastResizeTime.current > 100) {
        lastResizeTime.current = now;
        updateContainerWidth();
      }
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [updateContainerWidth]);

  useEffect(() => {
    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (selection.isSelecting && !createLessonCalledRef.current) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          cancelSelection();
        } else if (!(event.target as HTMLElement)?.closest('[data-room-index][data-time-index]')) {
          cancelSelection();
        }
      }
    };
    
    const handleGlobalRightClick = (e: MouseEvent) => {
      if (selection.isSelecting) {
        e.preventDefault();
        cancelSelection();
      }
    };
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selection.isSelecting) {
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
  }, [selection.isSelecting, cancelSelection]);

  return (
    <div className="border rounded-md overflow-hidden shadow-sm bg-background dark:bg-background border-border dark:border-border">
      <div className="p-3 border-b bg-muted dark:bg-muted border-border dark:border-border">
        <h3 className="font-medium text-lg text-foreground dark:text-foreground">{formattedDate}</h3>
        {filteredSessions.length === 0 && (
          <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
            この日の授業はまだありません
          </div>
        )}
        {filteredSessions.length > 0 && (
          <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
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

          <div className="relative">
            {rooms.map((room, roomIndex) => (
              <RoomRow
                key={`room-${room.boothId || roomIndex}`}
                room={room}
                roomIndex={roomIndex}
                timeSlots={timeSlots}
                selectionStart={selection.start}
                selectionEnd={selection.end}
                isSelecting={selection.isSelecting}
                onStartSelection={handleStartSelection}
                onCellHover={handleCellHover}
                onEndSelection={handleEndSelection}
              />
            ))}
          </div>

          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          >
            {filteredSessions.map(session => (
              <LessonCard
                key={`lesson-${session.classId}`}
                lesson={session}
                rooms={rooms}
                onClick={onLessonClick}
                timeSlotHeight={TIME_SLOT_HEIGHT}
                timeSlots={timeSlots}
                maxZIndex={9}
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