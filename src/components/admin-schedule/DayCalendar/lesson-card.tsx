import React, { useMemo } from 'react';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { TimeSlot } from './day-calendar';
import { UserCheck, GraduationCap } from "lucide-react"
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { calculateLessonPosition, extractTime, findClosestTimeSlot, calculateDurationInSlots } from '@/utils/lesson-positioning';

interface Booth {
  boothId: string;
  name?: string;
}

interface LessonCardProps {
  lesson: ExtendedClassSessionWithRelations;
  booths: Booth[];
  onClick: (lesson: ExtendedClassSessionWithRelations) => void;
  timeSlotHeight: number;
  timeSlots: TimeSlot[];
  maxZIndex?: number;
  isOverlay?: boolean; // New prop to disable draggable in overlay
}

// Note: extractTime is now imported from utils/lesson-positioning

const LessonCardComponent: React.FC<LessonCardProps> = ({ 
  lesson, 
  booths, 
  onClick, 
  timeSlotHeight, 
  timeSlots,
  maxZIndex = 10,
  isOverlay = false 
}) => {
  // Calculate lesson position
  const position = useMemo(() => calculateLessonPosition(lesson, timeSlots, booths), [
    lesson.startTime,
    lesson.endTime,
    lesson.boothId,
    lesson.boothName,
    lesson.booth,
    timeSlots,
    booths
  ]);
  
  const startTime = useMemo(() => extractTime(lesson.startTime), [lesson.startTime]);
  const endTime = useMemo(() => extractTime(lesson.endTime), [lesson.endTime]);
  
  // Initialize draggable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lesson.classId,
    data: { lesson },
    disabled: isOverlay // Disable if used as overlay
  });
  
  
  // Determine effective position for rendering
  const { effectiveStartIndex, effectiveDuration } = useMemo(() => {
    if (position.isValid) {
      return {
        effectiveStartIndex: position.startSlotIndex,
        effectiveDuration: position.duration
      };
    }
    
    // Fallback for invalid positions
    console.warn(`Invalid lesson position: ${lesson.classId}`, {
      startTime,
      endTime,
      position
    });
    
    // Try to find the closest valid position
    const closestStartIndex = startTime ? findClosestTimeSlot(startTime, timeSlots) : 0;
    const fallbackDuration = calculateDurationInSlots(startTime, endTime, 15) || 3;
    
    return {
      effectiveStartIndex: closestStartIndex,
      effectiveDuration: fallbackDuration
    };
  }, [position, lesson.classId, startTime, endTime, timeSlots]);
  
  const colors = useMemo(() => {
    const isRecurringLesson = lesson.seriesId !== null && lesson.seriesId !== undefined;
    const subjectName = lesson.subject?.name || lesson.subjectName || '';
    
    if (isRecurringLesson) {
      return {
        background: 'bg-indigo-100 dark:bg-indigo-900/70',
        border: 'border-indigo-300 dark:border-indigo-700',
        text: 'text-indigo-800 dark:text-indigo-100',
        hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800'
      };
    } else {
      return {
        background: 'bg-red-100 dark:bg-red-900/70',
        border: 'border-red-300 dark:border-red-700',
        text: 'text-red-800 dark:text-red-100',
        hover: 'hover:bg-red-200 dark:hover:bg-red-800'
      };
    }
  }, [lesson.seriesId, lesson.subject?.name, lesson.subjectName]);
  
  const style = useMemo(() => {
    // Don't apply positioning for overlay cards
    if (isOverlay) {
      return {
        width: `${effectiveDuration * 50}px`,
        height: `${timeSlotHeight - 2}px`,
        position: 'relative' as const,
      } as React.CSSProperties;
    }
    
    // Original positioning for non-overlay cards
    return {
      position: 'absolute' as const,
      left: `${effectiveStartIndex * 50 + 100}px`,
      top: `${position.boothIndex * timeSlotHeight}px`, 
      width: `${effectiveDuration * 50}px`,
      height: `${timeSlotHeight - 2}px`,
      zIndex: isDragging ? maxZIndex + 10 : maxZIndex - 1,
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0 : 1, // Hide completely when dragging
      visibility: isDragging ? 'hidden' : 'visible', // Also use visibility for better hiding
    } as React.CSSProperties;
  }, [effectiveStartIndex, effectiveDuration, position.boothIndex, timeSlotHeight, maxZIndex, isDragging, transform, isOverlay]);
  
  const isNarrow = effectiveDuration <= 1;
  
  if (effectiveStartIndex < 0) {
    console.error('Невозможно отобразить урок - недопустимый индекс начала:', effectiveStartIndex);
    return null;
  }

  const subjectName = lesson.subject?.name || lesson.subjectName || 'Предмет не указан';
  const teacherName = lesson.teacher?.name || lesson.teacherName || 'Преподаватель не указан';
  const studentName = lesson.student?.name || lesson.studentName || 'Студент не указан';
  const boothName = lesson.booth?.name || lesson.boothName || 'Бут не указан';
  
  // Get student type and grade
  const studentType = lesson.studentTypeName || lesson.student?.studentType?.name || '';
  const gradeYear = lesson.studentGradeYear || lesson.student?.gradeYear || '';
  const studentTypeLabel = studentType && gradeYear ? `${studentType.charAt(0)}${gradeYear}` : '';

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      className={`
        absolute rounded border shadow-sm
        transition-all duration-100 ease-in-out transform
        ${colors.background} ${colors.border} ${colors.text}
        ${!isOverlay && !isDragging ? colors.hover : ''}
        ${!isOverlay && !isDragging ? 'hover:scale-[1.02] hover:shadow-lg' : ''}
        ${!isOverlay && !isDragging ? 'active:scale-[0.98]' : ''}
        overflow-hidden truncate pointer-events-auto
        ${!isOverlay && !isDragging ? 'cursor-grab hover:ring-2 hover:ring-blue-400/50 dark:hover:ring-blue-500/50' : ''}
        ${isOverlay ? 'ring-2 ring-blue-500 shadow-2xl' : ''}
      `}
      style={style}
      onClick={(e) => {
        // Only trigger onClick if not dragging and not overlay
        if (!isDragging && !isOverlay) {
          onClick(lesson);
        }
      }}
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
    >
      <div className="text-[11px] p-1 flex flex-col h-full justify-between relative">
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1">
            <span className="truncate font-medium">
              {studentName}
            </span>
            {studentTypeLabel && (
              <span className="text-[8px] px-1 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 rounded flex-shrink-0">
                {studentTypeLabel}
              </span>
            )}
          </div>
          <span className="truncate text-right ml-2">
            {teacherName}
          </span>
        </div>
        
        {/* Bottom row */}
        {!isNarrow && (
          <div className="flex justify-between items-end mt-auto">
            <span className="truncate">
              {boothName}
            </span>
            <span className="truncate text-right font-medium">
              {subjectName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

LessonCardComponent.displayName = 'LessonCard';

export const LessonCard = React.memo(LessonCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.lesson.classId === nextProps.lesson.classId &&
    prevProps.timeSlotHeight === nextProps.timeSlotHeight &&
    prevProps.lesson.startTime === nextProps.lesson.startTime &&
    prevProps.lesson.endTime === nextProps.lesson.endTime &&
    prevProps.lesson.boothId === nextProps.lesson.boothId &&
    prevProps.lesson.seriesId === nextProps.lesson.seriesId &&
    prevProps.isOverlay === nextProps.isOverlay &&
    prevProps.maxZIndex === nextProps.maxZIndex &&
    prevProps.timeSlots.length === nextProps.timeSlots.length &&
    prevProps.booths.length === nextProps.booths.length
  );
});