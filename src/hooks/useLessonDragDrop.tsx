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

interface DropData {
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
        distance: 0, // Immediate activation on click
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
    // Calculate lesson duration in minutes
    const startTime = typeof lesson.startTime === 'string' ? lesson.startTime : '';
    const endTime = typeof lesson.endTime === 'string' ? lesson.endTime : '';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const durationMinutes = ((endHour - startHour) * 60) + (endMin - startMin);
    const slotCount = Math.ceil(durationMinutes / 15); // 15-minute slots
    
    // Get new start time from drop position
    const newStartSlot = timeSlots[dropData.timeIndex];
    if (!newStartSlot) return null;
    
    // Calculate new end time
    const endSlotIndex = dropData.timeIndex + slotCount - 1;
    const newEndSlot = timeSlots[endSlotIndex];
    
    // If we don't have enough slots, use the last available slot
    const actualEndSlot = newEndSlot || timeSlots[timeSlots.length - 1];
    
    return {
      startTime: newStartSlot.start,
      endTime: actualEndSlot.end,
    };
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
      return;
    }

    // Calculate new times
    const newTimes = calculateNewTimes(dropData, draggedLesson);
    
    if (!newTimes) {
      toast.error('無効なドロップ位置です');
      setActiveId(null);
      return;
    }

    // Get the booth from the drop position
    const newBooth = booths[dropData.boothIndex];
    if (!newBooth) {
      toast.error('無効な教室です');
      setActiveId(null);
      return;
    }

    // Update the class session
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
        },
      });
    }

    setActiveId(null);
  }, [draggedLesson, booths, calculateNewTimes, onLessonUpdate, updateClassSession]);

  // Define components as functions that return JSX
  const DndContextWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]} // This ensures cursor stays at drag point
      >
        {children}
      </DndContext>
    );
  };

  // Custom drop animation for better alignment
  const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.8",
        },
      },
    }),
  };

  const DragOverlayWrapper: React.FC = () => {
    if (!draggedLesson) return null;

    // Create minimal props for overlay card
    const overlayProps = {
      lesson: draggedLesson,
      booths: booths,
      onClick: () => {}, // No-op for overlay
      timeSlotHeight: 48, // Standard height for overlay
      timeSlots: timeSlots,
      maxZIndex: 999,
      isOverlay: true // Prevent nested draggable
    };

    return (
      <DragOverlay 
        dropAnimation={dropAnimationConfig}
        adjustScale={false} // Prevent scale adjustments
      >
        <LessonCard {...overlayProps} />
      </DragOverlay>
    );
  };

  return {
    draggedLesson,
    isDragging: !!activeId,
    DndContextWrapper,
    DragOverlayWrapper,
  };
}