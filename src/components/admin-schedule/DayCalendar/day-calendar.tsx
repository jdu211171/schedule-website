import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ExtendedClassSessionWithRelations, DayFilters } from '@/hooks/useClassSessionQuery';
import { getDateKey } from '../date';
import { LessonCard, extractTime } from './lesson-card';
import { DayCalendarFilters } from './day-calendar-filters';
import { AvailabilityLayer, useAvailability } from './availability-layer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export type TimeSlot = {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
};

export type SelectionPosition = {
  row: number;
  col: number;
};

interface Booth {
  boothId: string;
  name: string;
}

type AvailabilityMode = 'with-special' | 'regular-only';

type DayCalendarProps = {
  date: Date;
  booths: Booth[];
  timeSlots: TimeSlot[];
  classSessions: ExtendedClassSessionWithRelations[];
  onLessonClick: (lesson: ExtendedClassSessionWithRelations) => void;
  onCreateLesson: (date: Date, startTime: string, endTime: string, boothId: string) => void;
  resetSelectionKey?: number;
  filters?: DayFilters;
  onFiltersChange?: (filters: DayFilters) => void;
  selectedTeacherId?: string;
  selectedStudentId?: string;
  selectedClassTypeId?: string;
  availabilityMode?: AvailabilityMode;
  onAvailabilityModeChange?: (mode: AvailabilityMode) => void;
};

const CELL_WIDTH = 50;
const BOOTH_LABEL_WIDTH = 100;
const TIME_SLOT_HEIGHT = 50;

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
  boothIndex: number,
  timeIndex: number,
  selectionStart: SelectionPosition | null,
  selectionEnd: SelectionPosition | null
): boolean => {
  if (!selectionStart || !selectionEnd) return false;

  if (boothIndex !== selectionStart.row) return false;

  const minCol = Math.min(selectionStart.col, selectionEnd.col);
  const maxCol = Math.max(selectionStart.col, selectionEnd.col);

  return timeIndex >= minCol && timeIndex <= maxCol;
};

const CalendarCell = React.memo(({
  boothIndex,
  timeSlot,
  isSelected,
  isSelecting,
  canDrag,
  onMouseDown,
  onMouseEnter,
  onMouseUp
}: {
  boothIndex: number,
  timeSlot: TimeSlot,
  isSelected: boolean,
  isSelecting: boolean,
  canDrag: boolean,
  onMouseDown: (e: React.MouseEvent) => void,
  onMouseEnter: (e: React.MouseEvent) => void,
  onMouseUp: (e: React.MouseEvent) => void
}) => {
  const cellKey = `cell-${boothIndex}-${timeSlot.index}`;

  return (
    <div
      key={cellKey}
      id={cellKey}
      data-booth-index={boothIndex}
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
    ? "!bg-blue-200 dark:!bg-blue-900 !opacity-100 shadow-inner"
    : ""
  }
  border-border dark:border-border
  ${!isSelecting ? "transition-none" : ""}
`}
      style={{
        width: `${CELL_WIDTH}px`,
        minWidth: `${CELL_WIDTH}px`,
        height: `${TIME_SLOT_HEIGHT}px`,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.boothIndex === nextProps.boothIndex &&
         prevProps.timeSlot.index === nextProps.timeSlot.index &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isSelecting === nextProps.isSelecting &&
         prevProps.canDrag === nextProps.canDrag;
});

CalendarCell.displayName = 'CalendarCell';

const BoothRow = React.memo(({
  booth,
  boothIndex,
  timeSlots,
  selectionStart,
  selectionEnd,
  isSelecting,
  canDrag,
  onStartSelection,
  onCellHover,
  onEndSelection
}: {
  booth: Booth,
  boothIndex: number,
  timeSlots: TimeSlot[],
  selectionStart: SelectionPosition | null,
  selectionEnd: SelectionPosition | null,
  isSelecting: boolean,
  canDrag: boolean,
  onStartSelection: (boothIndex: number, timeIndex: number, e: React.MouseEvent) => void,
  onCellHover: (boothIndex: number, timeIndex: number, e: React.MouseEvent) => void,
  onEndSelection: (e: React.MouseEvent) => void
}) => {
  return (
    <div
      className="flex relative"
      style={{ height: `${TIME_SLOT_HEIGHT}px` }}
    >
      <div
        className="flex items-center justify-center bg-background dark:bg-background border-r border-b text-sm font-medium text-foreground dark:text-foreground px-2 border-border dark:border-border sticky left-0"
        style={{
          width: `${BOOTH_LABEL_WIDTH}px`,
          minWidth: `${BOOTH_LABEL_WIDTH}px`,
          height: `${TIME_SLOT_HEIGHT}px`,
          zIndex: 20
        }}
      >
        <span className="truncate">{booth.name}</span>
      </div>

      {timeSlots.map((timeSlot) => {
        const isSelected = isCellInSelection(boothIndex, timeSlot.index, selectionStart, selectionEnd);

        return (
          <CalendarCell
            key={`cell-${boothIndex}-${timeSlot.index}`}
            boothIndex={boothIndex}
            timeSlot={timeSlot}
            isSelected={isSelected}
            isSelecting={isSelecting}
            canDrag={canDrag}
            onMouseDown={(e) => onStartSelection(boothIndex, timeSlot.index, e)}
            onMouseEnter={(e) => onCellHover(boothIndex, timeSlot.index, e)}
            onMouseUp={onEndSelection}
          />
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.boothIndex === nextProps.boothIndex &&
         prevProps.booth.boothId === nextProps.booth.boothId &&
         prevProps.isSelecting === nextProps.isSelecting &&
         prevProps.canDrag === nextProps.canDrag &&
         prevProps.selectionStart === nextProps.selectionStart &&
         prevProps.selectionEnd === nextProps.selectionEnd;
});

BoothRow.displayName = 'BoothRow';

const TimeHeader = React.memo(({
  timeSlots,
  teacherAvailability,
  studentAvailability,
  availabilityMode
}: {
  timeSlots: TimeSlot[],
  teacherAvailability?: boolean[],
  studentAvailability?: boolean[],
  availabilityMode?: AvailabilityMode
}) => {
  return (
    <div
      className="flex bg-background dark:bg-background shadow-sm border-b border-border dark:border-border sticky top-0 z-20"
      style={{ height: `${TIME_SLOT_HEIGHT}px` }}
    >
      <div
        className="flex items-center justify-center font-semibold border-r text-sm text-foreground dark:text-foreground bg-background dark:bg-background border-border dark:border-border sticky left-0"
        style={{
          width: `${BOOTH_LABEL_WIDTH}px`,
          minWidth: `${BOOTH_LABEL_WIDTH}px`,
          height: `${TIME_SLOT_HEIGHT}px`,
          zIndex: 30
        }}
      >
        教室
      </div>

      <div className="flex relative" style={{ height: `${TIME_SLOT_HEIGHT}px` }}>
        {timeSlots.map((timeSlot) => (
          <div
            key={`time-${timeSlot.index}`}
            data-time-index={timeSlot.index}
            className={`flex items-center justify-center font-semibold border-r text-xs border-border dark:border-border relative
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

        {/* Availability overlay for sticky header */}
        {(teacherAvailability || studentAvailability) && (
          <AvailabilityLayer
            timeSlots={timeSlots}
            booths={[]} // Not needed for header overlay
            teacherAvailability={teacherAvailability}
            studentAvailability={studentAvailability}
            timeSlotHeight={TIME_SLOT_HEIGHT}
            availabilityMode={availabilityMode}
          />
        )}
      </div>
    </div>
  );
});

TimeHeader.displayName = 'TimeHeader';

// FIXED: Helper function to normalize date comparison
const normalizeDate = (date: string | Date): string => {
  if (date instanceof Date) {
    return getDateKey(date); // Use our fixed getDateKey function
  }
  return typeof date === 'string' ? date.split('T')[0] : date;
};

const DayCalendarComponent: React.FC<DayCalendarProps> = ({
  date,
  booths,
  timeSlots,
  classSessions,
  onLessonClick,
  onCreateLesson,
  resetSelectionKey = 0,
  filters = {},
  onFiltersChange,
  selectedTeacherId,
  selectedStudentId,
  selectedClassTypeId,
  availabilityMode = 'with-special',
  onAvailabilityModeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);

  const createLessonCalledRef = useRef(false);
  const lastResizeTime = useRef(0);

  // Передаем availabilityMode в useAvailability
  const { teacherAvailability, studentAvailability } = useAvailability(
    selectedTeacherId,
    selectedStudentId,
    date,
    timeSlots,
    availabilityMode
  );

  const dateKey = useMemo(() => {
    return getDateKey(date); // Use consistent date formatting
  }, [date]);

  // FIXED: Better date filtering using normalized dates
  const filteredSessions = useMemo(() => {
    const targetDateStr = normalizeDate(date);

    const filtered = classSessions.filter(session => {
      const sessionDateStr = normalizeDate(session.date);
      const matches = sessionDateStr === targetDateStr;

      if (!matches) {
        console.log(`Session ${session.classId} date mismatch: ${sessionDateStr} !== ${targetDateStr}`);
      }

      return matches;
    });

    return filtered;
  }, [classSessions, date]);

  const earliestLesson = useMemo(() => {
    if (filteredSessions.length === 0) return null;
    
    return filteredSessions.reduce((earliest, current) => {
      const earliestTime = extractTime(earliest.startTime);
      const currentTime = extractTime(current.startTime);
      
      const [earliestHour, earliestMin] = earliestTime.split(':').map(Number);
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      
      const earliestMinutes = earliestHour * 60 + earliestMin;
      const currentMinutes = currentHour * 60 + currentMin;
      
      return currentMinutes < earliestMinutes ? current : earliest;
    });
  }, [filteredSessions]);

  const totalGridWidth = useMemo(() => {
    return timeSlots.length * CELL_WIDTH;
  }, [timeSlots.length]);

  const formattedDate = useMemo(() => {
    return format(date, 'MM月dd日 (eee)', { locale: ja });
  }, [date]);

  const canDrag = useMemo(() => {
    return true; // Always allow dragging
  }, []);

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

  // Auto-scroll to earliest lesson
  useEffect(() => {
    if (!earliestLesson || !containerRef.current) return;
    
    const startTime = extractTime(earliestLesson.startTime);
    const [hour, minute] = startTime.split(':').map(Number);
    
    // Find the time slot index
    const timeSlotIndex = timeSlots.findIndex(slot => {
      const [slotHour, slotMinute] = slot.start.split(':').map(Number);
      return slotHour === hour && slotMinute === minute;
    });
    
    if (timeSlotIndex !== -1) {
      // Calculate scroll position (with some padding)
      const scrollPosition = (timeSlotIndex * CELL_WIDTH) - 100;
      
      // Scroll horizontally to show the earliest lesson
      containerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [earliestLesson, timeSlots, date]);

  const handleStartSelection = useCallback((boothIndex: number, timeIndex: number, e: React.MouseEvent) => {
    e.preventDefault();

    // Always allow selection - no canDrag check
    const start = { row: boothIndex, col: timeIndex };

    setSelection({
      isSelecting: true,
      start: start,
      end: start
    });
    document.body.classList.add('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  const handleCellHover = useCallback((boothIndex: number, timeIndex: number, e: React.MouseEvent) => {
    if (!selection.isSelecting || !selection.start) return;
    e.preventDefault();

    if (boothIndex === selection.start.row) {
      setSelection(prev => ({
        ...prev,
        end: { row: boothIndex, col: timeIndex }
      }));
    }
  }, [selection.isSelecting, selection.start]);

  const handleEndSelection = useCallback((e: React.MouseEvent) => {
    if (selection.isSelecting && selection.start && selection.end && !createLessonCalledRef.current) {
      e.preventDefault();

      const startCol = Math.min(selection.start.col, selection.end.col);
      const endCol = Math.max(selection.start.col, selection.end.col);
      const boothIndex = selection.start.row;

      const isValidSelection = endCol > startCol;
      if (isValidSelection) {
        if (startCol >= 0 && startCol < timeSlots.length &&
            endCol >= 0 && endCol < timeSlots.length &&
            boothIndex >= 0 && boothIndex < booths.length) {

          const startTime = timeSlots[startCol].start;
          const endTime = timeSlots[endCol].end;
          const selectedBoothId = booths[boothIndex].boothId;

          createLessonCalledRef.current = true;

          onCreateLesson(date, startTime, endTime, selectedBoothId);

          return;
        }
      }

      cancelSelection();
    }
  }, [selection, timeSlots, booths, onCreateLesson, date, cancelSelection]);

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
        } else if (!(event.target as HTMLElement)?.closest('[data-booth-index][data-time-index]')) {
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

  // Обработчик для индивидуального switch
  const handleDayAvailabilityToggle = useCallback((checked: boolean) => {
    const newMode: AvailabilityMode = checked ? 'regular-only' : 'with-special';
    onAvailabilityModeChange?.(newMode);
  }, [onAvailabilityModeChange]);

  return (
    <div className="border rounded-md overflow-hidden shadow-sm bg-background dark:bg-background border-border dark:border-border">
      <div className="p-3 border-b bg-muted dark:bg-muted border-border dark:border-border">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
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
            {!canDrag && (
              <div className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-medium">
                 授業を作成するには授業タイプ、教師、生徒を選択してください
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Индивидуальный switch для каждой таблицы дня - показываем всегда если есть колбэк */}
            {onAvailabilityModeChange && (
              <div className="flex items-center space-x-2 bg-background/80 border border-border rounded-md px-2 py-1">
                <Switch
                  id={`day-availability-${dateKey}`}
                  checked={availabilityMode === 'regular-only'}
                  onCheckedChange={handleDayAvailabilityToggle}
                />
                <Label htmlFor={`day-availability-${dateKey}`} className="text-xs font-medium cursor-pointer">
                  通常のみ
                </Label>
                <span className="text-xs text-muted-foreground">
                  ({availabilityMode === 'regular-only' ? 'ON' : 'OFF'})
                </span>
              </div>
            )}

            {onFiltersChange && (
              <div className="flex-1 pt-0.5 flex justify-end">
                <DayCalendarFilters
                  filters={filters}
                  dateKey={dateKey}
                  onFiltersChange={onFiltersChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative overflow-auto"
        style={{ maxHeight: '650px' }}
        ref={containerRef}
      >
        <div
          className="relative min-w-full select-none"
          style={{
            minWidth: `${Math.max(totalGridWidth + BOOTH_LABEL_WIDTH, containerWidth)}px`,
            height: `${(booths.length + 1) * TIME_SLOT_HEIGHT}px`
          }}
        >
          <TimeHeader
            timeSlots={timeSlots}
            teacherAvailability={teacherAvailability}
            studentAvailability={studentAvailability}
            availabilityMode={availabilityMode}
          />

          <div className="relative">
            {booths.map((booth, boothIndex) => (
              <BoothRow
                key={`booth-${booth.boothId || boothIndex}`}
                booth={booth}
                boothIndex={boothIndex}
                timeSlots={timeSlots}
                selectionStart={selection.start}
                selectionEnd={selection.end}
                isSelecting={selection.isSelecting}
                canDrag={canDrag}
                onStartSelection={handleStartSelection}
                onCellHover={handleCellHover}
                onEndSelection={handleEndSelection}
              />
            ))}
          </div>

          <div
            className="absolute pointer-events-none"
            style={{
              zIndex: 10,
              top: `${TIME_SLOT_HEIGHT}px`, // Start after the sticky header
              left: `0px`,
              width: '100%',
              height: `${booths.length * TIME_SLOT_HEIGHT}px`
            }}
          >
            {filteredSessions.map(session => (
              <LessonCard
                key={`lesson-${session.classId}`}
                lesson={session}
                booths={booths}
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
