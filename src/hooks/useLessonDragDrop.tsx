import { useState, useCallback, useMemo } from 'react';
import React from 'react';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { useClassSessionUpdate } from '@/hooks/useClassSessionMutation';
import { toast } from 'sonner';
import { LessonCard } from '@/components/admin-schedule/DayCalendar/lesson-card';
import { calculateNewLessonTimes, calculateDurationInSlots, extractTime, checkLessonOverlap } from '@/utils/lesson-positioning';

// Constants
const DEFAULT_TIME_SLOT_HEIGHT = 48;
const DRAG_ACTIVATION_DISTANCE = 0; // Immediate activation
const MAX_DRAG_OVERLAY_Z_INDEX = 999;

export interface TimeSlot {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
}

interface Booth {
  boothId: string;
  name: string;
}

export interface DropData {
  boothIndex: number;
  timeIndex: number;
  boothId: string;
  timeSlot: TimeSlot;
}

interface UseLessonDragDropProps {
  timeSlots: TimeSlot[];
  booths: Booth[];
  classSessions: ExtendedClassSessionWithRelations[];
  onLessonUpdate?: (classId: string, updates: any) => void;
}

interface UseLessonDragDropReturn {
  draggedLesson: ExtendedClassSessionWithRelations | null;
  isDragging: boolean;
  DndContextWrapper: React.FC<{ children: React.ReactNode }>;
  DragOverlayWrapper: React.FC;
  activeId: UniqueIdentifier | null;
}

export function useLessonDragDrop({
  timeSlots,
  booths,
  classSessions,
  onLessonUpdate,
}: UseLessonDragDropProps): UseLessonDragDropReturn {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const updateClassSession = useClassSessionUpdate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const draggedLesson = useMemo(() => {
    if (!activeId) return null;
    return classSessions.find(session => session.classId === activeId) || null;
  }, [activeId, classSessions]);

  const calculateNewTimes = useCallback((dropData: DropData, lesson: ExtendedClassSessionWithRelations) => {
    const startTime = extractTime(lesson.startTime);
    const endTime = extractTime(lesson.endTime);
    const lessonDurationSlots = calculateDurationInSlots(startTime, endTime, 15);
    
    return calculateNewLessonTimes(dropData.timeIndex, lessonDurationSlots, timeSlots);
  }, [timeSlots]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedLesson) {
      setActiveId(null);
      return;
    }

    const dropData = over.data.current as DropData | undefined;
    if (!dropData || dropData.boothIndex === undefined || dropData.timeIndex === undefined) {
      setActiveId(null);
      toast.error('Invalid drop location');
      return;
    }

    // Calculate new times
    const newTimes = calculateNewTimes(dropData, draggedLesson);
    if (!newTimes) {
      toast.error('Invalid time slot');
      setActiveId(null);
      return;
    }

    // Get the booth from the drop position
    const newBooth = booths[dropData.boothIndex];
    if (!newBooth) {
      toast.error('Invalid booth');
      setActiveId(null);
      return;
    }

    // Check for overlapping lessons
    const hasOverlap = checkLessonOverlap(
      draggedLesson.classId,
      newBooth.boothId,
      newTimes.startTime,
      newTimes.endTime,
      classSessions
    );

    if (hasOverlap) {
      toast.error('Cannot place lesson here - it would overlap with another lesson');
      setActiveId(null);
      return;
    }

    // Prepare update payload
    const updates = {
      classId: draggedLesson.classId,
      startTime: newTimes.startTime,
      endTime: newTimes.endTime,
      boothId: newBooth.boothId,
    };

    if (onLessonUpdate) {
      onLessonUpdate(draggedLesson.classId, updates);
    } else {
      updateClassSession.mutate(updates, {
        onError: (error) => {
          console.error('Failed to update lesson:', error);
          toast.error('Failed to update lesson');
        },
        onSuccess: () => {
          toast.success('Lesson updated successfully');
        },
      });
    }

    setActiveId(null);
  }, [draggedLesson, booths, calculateNewTimes, onLessonUpdate, updateClassSession, classSessions]);

  // Define components as functions that return JSX
  const DndContextWrapper = useCallback<React.FC<{ children: React.ReactNode }>>(({ children }) => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}
      >
        {children}
      </DndContext>
    );
  }, [sensors, handleDragStart, handleDragEnd]);

  // Custom drop animation configuration
  const dropAnimationConfig: DropAnimation = useMemo(() => ({
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.8",
        },
      },
    }),
  }), []);

  const DragOverlayWrapper = useCallback<React.FC>(() => {
    if (!draggedLesson) return null;

    const overlayProps = {
      lesson: draggedLesson,
      booths: booths,
      onClick: () => {},
      timeSlotHeight: DEFAULT_TIME_SLOT_HEIGHT,
      timeSlots: timeSlots,
      maxZIndex: MAX_DRAG_OVERLAY_Z_INDEX,
      isOverlay: true
    };

    return (
      <DragOverlay 
        dropAnimation={dropAnimationConfig}
        adjustScale={false}
      >
        <LessonCard {...overlayProps} />
      </DragOverlay>
    );
  }, [draggedLesson, booths, timeSlots, dropAnimationConfig]);

  return {
    draggedLesson,
    isDragging: !!activeId,
    DndContextWrapper,
    DragOverlayWrapper,
    activeId,
  };
}