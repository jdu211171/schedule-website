import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DndContext,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ExtendedClassSessionWithRelations, DayFilters } from '@/hooks/useClassSessionQuery';
import { getDateKey } from '../date';
import { LessonCard, extractTime } from './lesson-card';
import { DayCalendarFilters } from './day-calendar-filters';
import { AvailabilityLayer, useAvailability } from './availability-layer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useClassSessionUpdate } from '@/hooks/useClassSessionMutation';
import { useUpdateClassSeries } from '@/hooks/use-class-series';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const { setNodeRef, isOver } = useDroppable({ id: cellKey });

  return (
    <div
      ref={setNodeRef}
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
  ${isOver ? 'outline outline-2 outline-blue-400/70' : ''}
  border-border dark:border-border
  ${!isSelecting ? "transition-none" : ""}
`}
      style={{
        width: `${CELL_WIDTH}px`,
        minWidth: `${CELL_WIDTH}px`,
        height: '100%',
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
  onEndSelection,
  rowHeight
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
  onEndSelection: (e: React.MouseEvent) => void,
  rowHeight: number
}) => {
  return (
    <div
      className="flex relative"
      style={{ height: `${rowHeight}px` }}
    >
      <div
        className="flex items-center justify-center bg-background dark:bg-background border-r border-b text-sm font-medium text-foreground dark:text-foreground px-2 border-border dark:border-border sticky left-0"
        style={{
          width: `${BOOTH_LABEL_WIDTH}px`,
          minWidth: `${BOOTH_LABEL_WIDTH}px`,
          height: `${rowHeight}px`,
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
         prevProps.selectionEnd === nextProps.selectionEnd &&
         prevProps.rowHeight === nextProps.rowHeight;
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
        ブース
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

  // --- Overlap/Lane computation helpers ---
  const getStartSlotIndex = useCallback((t: string) => {
    const exact = timeSlots.findIndex((s) => s.start === t);
    if (exact >= 0) return exact;
    return timeSlots.findIndex((slot) => {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [th, tm] = t.split(':').map(Number);
      if (Number.isNaN(sh) || Number.isNaN(th)) return false;
      const slotMin = sh * 60 + (sm || 0);
      const tMin = th * 60 + (tm || 0);
      return slotMin <= tMin && tMin < slotMin + 30;
    });
  }, [timeSlots]);

  const getEndSlotIndex = useCallback((t: string, fallbackStart: number) => {
    const exact = timeSlots.findIndex((s) => s.start === t);
    if (exact >= 0) return exact;
    const idx = timeSlots.findIndex((slot) => {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [th, tm] = t.split(':').map(Number);
      if (Number.isNaN(sh) || Number.isNaN(th)) return false;
      const slotMin = sh * 60 + (sm || 0);
      const tMin = th * 60 + (tm || 0);
      return slotMin <= tMin && tMin < slotMin + 30;
    });
    return idx >= 0 ? idx : Math.max(fallbackStart + 1, fallbackStart + 3);
  }, [timeSlots]);

  // --- Compute per-session positions and lane assignments ---
  type Pos = { boothIndex: number; start: number; end: number };
  const sessionPos = useMemo(() => {
    const map = new Map<string, Pos>();
    filteredSessions.forEach((lesson) => {
      const st = extractTime(lesson.startTime);
      const et = extractTime(lesson.endTime);
      const start = getStartSlotIndex(st);
      const end = getEndSlotIndex(et, start);
      const boothIdx = (() => {
        const byId = booths.findIndex((b) => b.boothId === lesson.boothId);
        if (byId >= 0) return byId;
        const byName = booths.findIndex((b) => b.name === (lesson as any).boothName || (lesson as any).booth?.name);
        return byName >= 0 ? byName : 0;
      })();
      map.set(String(lesson.classId), { boothIndex: boothIdx, start, end });
    });
    return map;
  }, [filteredSessions, booths, getStartSlotIndex, getEndSlotIndex]);

  const { laneMap, boothLaneCounts } = useMemo(() => {
    const laneMap = new Map<string, { laneIndex: number }>();
    const boothLaneCounts = new Map<number, number>();

    const byBooth = new Map<number, Array<{ id: string; start: number; end: number }>>();
    filteredSessions.forEach((s) => {
      const pos = sessionPos.get(String(s.classId));
      if (!pos) return;
      if (!byBooth.has(pos.boothIndex)) byBooth.set(pos.boothIndex, []);
      byBooth.get(pos.boothIndex)!.push({ id: String(s.classId), start: pos.start, end: pos.end });
    });

    byBooth.forEach((list, boothIdx) => {
      list.sort((a, b) => a.start - b.start || a.end - b.end);
      const laneEnds: number[] = [];
      list.forEach((ev) => {
        let assigned = -1;
        for (let i = 0; i < laneEnds.length; i++) { if (laneEnds[i] <= ev.start) { assigned = i; break; } }
        if (assigned === -1) { laneEnds.push(ev.end); assigned = laneEnds.length - 1; }
        else { laneEnds[assigned] = ev.end; }
        laneMap.set(ev.id, { laneIndex: assigned });
      });
      boothLaneCounts.set(boothIdx, Math.max(1, laneEnds.length));
    });

    booths.forEach((_, idx) => { if (!boothLaneCounts.has(idx)) boothLaneCounts.set(idx, 1); });
    return { laneMap, boothLaneCounts };
  }, [filteredSessions, sessionPos, booths]);

  const boothRowHeights = useMemo(() => booths.map((_, idx) => (boothLaneCounts.get(idx) || 1) * TIME_SLOT_HEIGHT), [booths, boothLaneCounts]);
  const boothTopOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < boothRowHeights.length; i++) { offsets.push(acc); acc += boothRowHeights[i]; }
    return offsets;
  }, [boothRowHeights]);
  const contentHeight = useMemo(() => boothRowHeights.reduce((a, b) => a + b, 0), [boothRowHeights]);

  // Conflict gutter ranges per booth
  const conflictRanges = useMemo(() => {
    type Range = { start: number; end: number; boothIndex: number };
    const ranges: Range[] = [];
    const byBooth: Map<number, Array<{ start: number; end: number }>> = new Map();
    filteredSessions.forEach((s) => {
      const pos = sessionPos.get(String(s.classId));
      if (!pos) return;
      if (!byBooth.has(pos.boothIndex)) byBooth.set(pos.boothIndex, []);
      byBooth.get(pos.boothIndex)!.push({ start: pos.start, end: pos.end });
    });
    byBooth.forEach((events, boothIndex) => {
      const conc = new Array(timeSlots.length).fill(0);
      events.forEach(({ start, end }) => {
        for (let i = Math.max(0, start); i < Math.min(timeSlots.length, end); i++) conc[i] += 1;
      });
      let i = 0; while (i < conc.length) {
        if (conc[i] > 1) { const start = i; while (i < conc.length && conc[i] > 1) i++; const end = i; ranges.push({ start, end, boothIndex }); }
        else i++;
      }
    });
    return ranges;
  }, [filteredSessions, sessionPos, timeSlots.length]);

  // DnD: sensors and handlers
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ boothIdx: number; timeIdx: number; durationSlots: number } | null>(null);
  const updateClassSession = useClassSessionUpdate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<null | { classId: string; seriesId: string | null; startTime: string; endTime: string; boothId?: string }>(null);
  const [seriesForHook, setSeriesForHook] = useState<string>('');
  const updateSeries = useUpdateClassSeries(seriesForHook || '');
  const qc = useQueryClient();

  const cancelSelection = useCallback(() => {
    setSelection(initialSelectionState);
    document.body.classList.remove('cursor-move');
    createLessonCalledRef.current = false;
  }, []);

  const onDragStart = useCallback((e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
    const lesson = filteredSessions.find((s) => s.classId === String(e.active.id)) || classSessions.find((s) => s.classId === String(e.active.id));
    if (!lesson) return;
    const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const s = typeof lesson.startTime === 'string' ? lesson.startTime : extractTime(lesson.startTime);
    const et = typeof lesson.endTime === 'string' ? lesson.endTime : extractTime(lesson.endTime);
    const findSlotIndex = (hhmm: string): number => {
      const exact = timeSlots.findIndex((slot) => slot.start === hhmm);
      if (exact >= 0) return exact;
      const t = toMin(hhmm);
      let idx = 0; let best = Number.POSITIVE_INFINITY;
      timeSlots.forEach((slot, i) => { const diff = Math.abs(toMin(slot.start) - t); if (diff < best) { best = diff; idx = i; } });
      return idx;
    };
    const startIdx = findSlotIndex(s);
    const endIdx = findSlotIndex(et);
    const durationSlots = Math.max(1, endIdx - startIdx);
    setGhost({ boothIdx: 0, timeIdx: 0, durationSlots });
  }, [filteredSessions, classSessions, timeSlots]);

  const onDragOver = useCallback((e: DragOverEvent) => {
    const { over } = e;
    if (!over?.id || !ghost) return;
    const overId = String(over.id);
    if (!overId.startsWith('cell-')) return;
    const parts = overId.split('-');
    let boothIdx = Number(parts[1]);
    let timeIdx = Number(parts[2]);
    if (Number.isNaN(boothIdx) || Number.isNaN(timeIdx)) return;
    const maxStart = Math.max(0, timeSlots.length - ghost.durationSlots);
    timeIdx = Math.min(Math.max(0, timeIdx), maxStart);
    setGhost({ boothIdx, timeIdx, durationSlots: ghost.durationSlots });
  }, [ghost, timeSlots.length]);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setDraggingId(null);
    setGhost(null);
    if (!active?.id || !over?.id) return;
    const overId = String(over.id);
    if (!overId.startsWith('cell-')) return;
    const parts = overId.split('-');
    const boothIdx = Number(parts[1]);
    const timeIdx = Number(parts[2]);
    if (Number.isNaN(boothIdx) || Number.isNaN(timeIdx)) return;
    const lesson = filteredSessions.find((s) => s.classId === active.id) || classSessions.find((s) => s.classId === active.id);
    if (!lesson) return;
    const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const s = typeof lesson.startTime === 'string' ? lesson.startTime : extractTime(lesson.startTime);
    const eTime = typeof lesson.endTime === 'string' ? lesson.endTime : extractTime(lesson.endTime);
    const duration = Math.max(30, (toMin(eTime) - toMin(s)) || 60);
    const newStart = timeSlots[timeIdx]?.start; if (!newStart) return;
    const [sh, sm] = newStart.split(':').map(Number);
    const endMin = (sh || 0) * 60 + (sm || 0) + duration;
    const newEnd = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    const targetBoothId = booths[boothIdx]?.boothId || undefined;
    if (lesson.seriesId) {
      setPending({ classId: String(active.id), seriesId: lesson.seriesId, startTime: newStart, endTime: newEnd, boothId: targetBoothId });
      setSeriesForHook(lesson.seriesId);
      setConfirmOpen(true);
      return;
    }
    updateClassSession.mutate({ classId: String(active.id), startTime: newStart, endTime: newEnd, boothId: targetBoothId });
  }, [filteredSessions, classSessions, booths, timeSlots, updateClassSession]);

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
                 授業を作成するには授業タイプ、講師、生徒を選択してください
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
            height: `${TIME_SLOT_HEIGHT + contentHeight}px`
          }}
        >
          <TimeHeader
            timeSlots={timeSlots}
            teacherAvailability={teacherAvailability}
            studentAvailability={studentAvailability}
            availabilityMode={availabilityMode}
          />

          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            modifiers={[restrictToParentElement]}
            collisionDetection={closestCenter}
          >
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
                  rowHeight={boothRowHeights[boothIndex]}
                />
              ))}
            </div>

            {/* Conflict gutter bands (below ghost/cards) */}
            <div
              className="absolute pointer-events-none"
              style={{
                zIndex: 9,
                top: `${TIME_SLOT_HEIGHT}px`,
                left: `0px`,
                width: '100%',
                height: `${contentHeight}px`
              }}
            >
              {conflictRanges.map((r, idx) => (
                <div
                  key={`gutter-${idx}`}
                  className="absolute"
                  style={{
                    left: `${r.start * CELL_WIDTH + BOOTH_LABEL_WIDTH}px`,
                    top: `${boothTopOffsets[r.boothIndex]}px`,
                    width: `${(r.end - r.start) * CELL_WIDTH}px`,
                    height: '4px',
                    background: 'linear-gradient(90deg, rgba(220,38,38,0.9), rgba(220,38,38,0.5))',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>

            {/* Ghost overlay */}
            <div
              className="absolute pointer-events-none"
              style={{
                zIndex: 10,
                top: `${TIME_SLOT_HEIGHT}px`,
                left: `0px`,
                width: '100%',
                height: `${contentHeight}px`,
              }}
            >
              {ghost && (
                <div
                  aria-hidden
                  className="absolute rounded-sm bg-blue-500/15 border-2 border-blue-400"
                  style={{
                    left: `${ghost.timeIdx * CELL_WIDTH + BOOTH_LABEL_WIDTH}px`,
                    top: `${boothTopOffsets[ghost.boothIdx] ?? 0}px`,
                    width: `${ghost.durationSlots * CELL_WIDTH}px`,
                    height: `${(boothRowHeights[ghost.boothIdx] ?? TIME_SLOT_HEIGHT) - 2}px`,
                  }}
                />
              )}
            </div>

            {/* Lessons overlay */}
            <div
              className="absolute pointer-events-none"
              style={{
                zIndex: 11,
                top: `${TIME_SLOT_HEIGHT}px`, // Start after the sticky header
                left: `0px`,
                width: '100%',
                height: `${contentHeight}px`
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
                  laneIndex={laneMap.get(String(session.classId))?.laneIndex || 0}
                  laneHeight={TIME_SLOT_HEIGHT}
                  rowTopOffset={boothTopOffsets[sessionPos.get(String(session.classId))?.boothIndex || 0]}
                  hasBoothOverlap={(laneMap.get(String(session.classId))?.laneIndex ?? 0) > 0 ||
                    (() => {
                      const pos = sessionPos.get(String(session.classId));
                      if (!pos) return false;
                      return filteredSessions.some(s2 => {
                        if (s2.classId === session.classId) return false;
                        const p2 = sessionPos.get(String(s2.classId));
                        return p2 && p2.boothIndex === pos.boothIndex && !(p2.end <= pos.start || pos.end <= p2.start);
                      });
                    })()
                  }
                />
              ))}
            </div>

            {/* Series scope dialog */}
            <Dialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setPending(null); }}>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>どの範囲を更新しますか？</DialogTitle>
                  <DialogDescription>
                    この授業は連続授業（シリーズ）の一部です。移動の適用範囲を選択してください。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 pt-2 text-sm">
                  <div>開始: <span className="font-mono">{pending?.startTime}</span> / 終了: <span className="font-mono">{pending?.endTime}</span></div>
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!pending) return;
                      updateClassSession.mutate({ classId: pending.classId, startTime: pending.startTime, endTime: pending.endTime, boothId: pending.boothId });
                      setConfirmOpen(false); setPending(null);
                    }}
                  >
                    この授業のみ
                  </Button>
                  <Button
                    onClick={() => {
                      if (!pending?.seriesId) return;
                      const pivot = filteredSessions.find(s => s.classId === pending.classId) || classSessions.find(s => s.classId === pending.classId);
                      const pivotDateStr = pivot ? normalizeDate(pivot.date) : null;
                      const boothName = pending.boothId ? (booths.find(b => b.boothId === pending.boothId)?.name || null) : null;
                      const snapshots: Array<[any, any]> = [];
                      if (pivotDateStr) {
                        const entries = qc.getQueriesData<any>({ queryKey: ['classSessions'] });
                        for (const [key] of entries) {
                          const current = qc.getQueryData<any>(key);
                          snapshots.push([key, current]);
                          if (!current) continue;
                          if (Array.isArray(current)) {
                            const next = current.map((s: any) => (s?.seriesId === pending.seriesId && normalizeDate(s.date) >= pivotDateStr)
                              ? { ...s, startTime: pending.startTime, endTime: pending.endTime, boothId: pending.boothId ?? s.boothId, boothName: boothName ?? s.boothName, updatedAt: new Date() }
                              : s);
                            qc.setQueryData(key, next);
                          } else if (current?.data && Array.isArray(current.data)) {
                            const next = {
                              ...current,
                              data: current.data.map((s: any) => (s?.seriesId === pending.seriesId && normalizeDate(s.date) >= pivotDateStr)
                                ? { ...s, startTime: pending.startTime, endTime: pending.endTime, boothId: pending.boothId ?? s.boothId, boothName: boothName ?? s.boothName, updatedAt: new Date() }
                                : s),
                            };
                            qc.setQueryData(key, next);
                          }
                        }
                        toast.success('シリーズ（仮）を更新しました');
                      }
                      updateSeries.mutate(
                        { startTime: pending.startTime, endTime: pending.endTime, ...(pending.boothId ? { boothId: pending.boothId } : {}), propagateFromClassId: pending.classId } as any,
                        {
                          onSuccess: () => {
                            toast.success('シリーズの授業を更新しました');
                            qc.invalidateQueries({ queryKey: ['classSessions'], refetchType: 'none' });
                          },
                          onError: (err: any) => {
                            for (const [key, data] of snapshots) qc.setQueryData(key, data);
                            const message = err?.message || 'シリーズ更新に失敗しました';
                            toast.error('シリーズ更新に失敗しました', { description: message });
                          },
                          onSettled: () => {
                            setConfirmOpen(false);
                            setPending(null);
                          }
                        }
                      );
                    }}
                  >
                    シリーズ全体
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

DayCalendarComponent.displayName = 'DayCalendar';

export const DayCalendar = React.memo(DayCalendarComponent);
