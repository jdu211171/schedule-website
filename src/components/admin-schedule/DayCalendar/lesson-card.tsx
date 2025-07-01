import React, { useMemo } from 'react';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { TimeSlot } from './admin-calendar-day';
import { UserCheck, GraduationCap } from "lucide-react"
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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

const extractTime = (timeValue: string | Date | undefined): string => {
  if (!timeValue) return '';
  
  try {
    if (typeof timeValue === 'string') {
      if (/^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      
      const timeMatch = timeValue.match(/T(\d{2}:\d{2}):/);
      if (timeMatch && timeMatch[1]) {
        return timeMatch[1];
      }
    } 
    else if (timeValue instanceof Date) {
      return `${timeValue.getHours().toString().padStart(2, '0')}:${timeValue.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  } catch {
    return '';
  }
};

const LessonCardComponent: React.FC<LessonCardProps> = ({ 
  lesson, 
  booths, 
  onClick, 
  timeSlotHeight, 
  timeSlots,
  maxZIndex = 10,
  isOverlay = false 
}) => {
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
  
  const startSlotIndex = useMemo(() => {
    const exactMatch = timeSlots.findIndex(slot => slot.start === startTime);
    if (exactMatch >= 0) return exactMatch;
    
    return timeSlots.findIndex(slot => {
      const slotTime = slot.start.split(':').map(Number);
      const startTimeArr = startTime.split(':').map(Number);
      
      if (!slotTime[0] || !startTimeArr[0]) return false;
      
      const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
      const startMinutes = startTimeArr[0] * 60 + (startTimeArr[1] || 0);
      
      return slotMinutes <= startMinutes && startMinutes < (slotMinutes + 30);
    });
  }, [startTime, timeSlots]);
  
  const endSlotIndex = useMemo(() => {
    const exactMatch = timeSlots.findIndex(slot => slot.start === endTime);
    if (exactMatch >= 0) return exactMatch;
    
    const matchedIndex = timeSlots.findIndex(slot => {
      const slotTime = slot.start.split(':').map(Number);
      const endTimeArr = endTime.split(':').map(Number);
      
      if (!slotTime[0] || !endTimeArr[0]) return false;
      
      const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
      const endMinutes = endTimeArr[0] * 60 + (endTimeArr[1] || 0);
      
      return slotMinutes <= endMinutes && endMinutes < (slotMinutes + 30);
    });
    
    return matchedIndex >= 0 ? matchedIndex : startSlotIndex + 3;
  }, [endTime, timeSlots, startSlotIndex]);
  
  const boothIndex = useMemo(() => {
    const exactMatch = booths.findIndex(booth => booth.boothId === lesson.boothId);
    if (exactMatch >= 0) return exactMatch;
    
    const nameMatch = booths.findIndex(booth => 
      booth.name === lesson.boothName || 
      (typeof lesson.booth === 'object' && lesson.booth && booth.name === lesson.booth.name)
    );
    
    return nameMatch >= 0 ? nameMatch : 0;
  }, [booths, lesson.boothId, lesson.boothName, lesson.booth]);
  
  const isValidPosition = startSlotIndex >= 0 && endSlotIndex > startSlotIndex && boothIndex >= 0;
  
  const { effectiveStartIndex, effectiveDuration } = useMemo(() => {
    if (isValidPosition) {
      return {
        effectiveStartIndex: startSlotIndex,
        effectiveDuration: Math.max(1, endSlotIndex - startSlotIndex)
      };
    }
    
    console.warn(`Невалидная позиция урока: ${lesson.classId}`, { 
      startTime, 
      endTime, 
      startSlotIndex, 
      endSlotIndex,
      boothId: lesson.boothId, 
      boothIndex 
    });
    
    const calculateDurationInSlots = () => {
      if (!startTime || !endTime) return 3;
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        return 3;
      }
      
      const durationMinutes = ((endHour - startHour) * 60) + (endMin - startMin);
      return Math.max(1, Math.ceil(durationMinutes / 30));
    };
    
    const durationSlots = calculateDurationInSlots();
    
    if (startTime) {
      const [hour, minute] = startTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        const totalMinutes = hour * 60 + minute;
        let closestSlotIndex = -1;
        let minDiff = Infinity;
        
        timeSlots.forEach((slot, index) => {
          const [slotHour, slotMinute] = slot.start.split(':').map(Number);
          if (!isNaN(slotHour) && !isNaN(slotMinute)) {
            const slotTotalMinutes = slotHour * 60 + slotMinute;
            const diff = Math.abs(totalMinutes - slotTotalMinutes);
            if (diff < minDiff) {
              minDiff = diff;
              closestSlotIndex = index;
            }
          }
        });
        
        if (closestSlotIndex >= 0) {
          return {
            effectiveStartIndex: closestSlotIndex,
            effectiveDuration: durationSlots
          };
        }
      }
    }
    
    return {
      effectiveStartIndex: 0,
      effectiveDuration: durationSlots
    };
  }, [isValidPosition, startSlotIndex, endSlotIndex, startTime, endTime, timeSlots, lesson.classId, boothIndex, lesson.boothId]);
  
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
      top: `${boothIndex * timeSlotHeight}px`, 
      width: `${effectiveDuration * 50}px`,
      height: `${timeSlotHeight - 2}px`,
      zIndex: isDragging ? maxZIndex + 10 : maxZIndex - 1,
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0 : 1, // Hide completely when dragging
      visibility: isDragging ? 'hidden' : 'visible', // Also use visibility for better hiding
    } as React.CSSProperties;
  }, [effectiveStartIndex, effectiveDuration, boothIndex, timeSlotHeight, maxZIndex, isDragging, transform, isOverlay]);
  
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
    prevProps.lesson.seriesId === nextProps.lesson.seriesId
  );
});