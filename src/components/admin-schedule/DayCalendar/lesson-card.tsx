import React, { useMemo } from 'react';
import { ClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { TimeSlot } from './admin-calendar-day';

interface Room {
  boothId: string;
  name: string;
}

interface LessonCardProps {
  lesson: ClassSessionWithRelations;
  rooms: Room[];
  onClick: (lesson: ClassSessionWithRelations) => void;
  timeSlotHeight: number;
  timeSlots: TimeSlot[];
  maxZIndex?: number;
}

// Извлекает время из ISO строки или объекта Date
const extractTime = (timeValue: string | Date | undefined): string => {
  if (!timeValue) return '';
  
  try {
    if (typeof timeValue === 'string') {
      const timeMatch = timeValue.match(/T(\d{2}:\d{2}):/);
      if (timeMatch && timeMatch[1]) {
        return timeMatch[1];
      }
    } 
    else if (timeValue instanceof Date) {
      return `${timeValue.getUTCHours().toString().padStart(2, '0')}:${timeValue.getUTCMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  } catch {
    return '';
  }
};

const LessonCardComponent: React.FC<LessonCardProps> = ({ 
  lesson, 
  rooms, 
  onClick, 
  timeSlotHeight, 
  timeSlots,
  maxZIndex = 10 
}) => {
  const startTime = useMemo(() => extractTime(lesson.startTime), [lesson.startTime]);
  const endTime = useMemo(() => extractTime(lesson.endTime), [lesson.endTime]);
  
  const startSlotIndex = useMemo(() => {
    return timeSlots.findIndex(slot => slot.start === startTime);
  }, [startTime, timeSlots]);
  
  const endSlotIndex = useMemo(() => {
    return timeSlots.findIndex(slot => slot.start === endTime);
  }, [endTime, timeSlots]);
  
  const roomIndex = useMemo(() => {
    return rooms.findIndex(room => room.boothId === lesson.boothId);
  }, [rooms, lesson.boothId]);
  
  const isValidPosition = useMemo(() => 
    startSlotIndex >= 0 && endSlotIndex > startSlotIndex && roomIndex >= 0
  , [startSlotIndex, endSlotIndex, roomIndex]);
  
  const { effectiveStartIndex, effectiveDuration } = useMemo(() => {
    if (isValidPosition) {
      return {
        effectiveStartIndex: startSlotIndex,
        effectiveDuration: endSlotIndex - startSlotIndex
      };
    }
    
    console.warn(`Неверная позиция урока: ${lesson.classId}`, { 
      startTime, 
      endTime, 
      startSlotIndex, 
      endSlotIndex,
      boothId: lesson.boothId, 
      roomIndex 
    });
    
    const fallbackStartIndex = startTime ? 
      timeSlots.findIndex(slot => startTime >= slot.start && startTime < slot.end) : -1;
    
    const fallbackEndIndex = endTime ? 
      timeSlots.findIndex(slot => endTime >= slot.start && endTime < slot.end) : -1;
    
    if (fallbackStartIndex >= 0 && fallbackEndIndex >= 0) {
      return {
        effectiveStartIndex: fallbackStartIndex,
        effectiveDuration: Math.max(1, fallbackEndIndex - fallbackStartIndex)
      };
    }
    
    return {
      effectiveStartIndex: -1,
      effectiveDuration: 0
    };
  }, [isValidPosition, startSlotIndex, endSlotIndex, startTime, endTime, timeSlots, lesson.classId, roomIndex, lesson.boothId]);
  
  const colors = useMemo(() => {
    const isRegularLesson = Boolean(lesson.regularClassTemplate) || 
                          (lesson.classType?.name === '通常授業');
    
    if (isRegularLesson) {
      return {
        background: 'bg-blue-100 dark:bg-blue-900/70',
        border: 'border-blue-300 dark:border-blue-700',
        text: 'text-blue-800 dark:text-blue-100',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-800'
      };
    } else {
      return {
        background: 'bg-red-100 dark:bg-red-900/70',
        border: 'border-red-300 dark:border-red-700',
        text: 'text-red-800 dark:text-red-100',
        hover: 'hover:bg-red-200 dark:hover:bg-red-800'
      };
    }
  }, [lesson.regularClassTemplate, lesson.classType?.name]);
  
  // Рассчитываем CSS стиль
  const style = useMemo(() => ({
    position: 'absolute',
    left: `${effectiveStartIndex * 40 + 100}px`,
    top: `${(roomIndex + 1) * timeSlotHeight}px`,
    width: `${effectiveDuration * 40}px`,
    height: `${timeSlotHeight - 2}px`,
    zIndex: maxZIndex - 1
  } as React.CSSProperties), [effectiveStartIndex, effectiveDuration, roomIndex, timeSlotHeight, maxZIndex]);
  
  const isNarrow = effectiveDuration <= 1;
  
  if (effectiveStartIndex < 0 || roomIndex < 0) {
    return null;
  }

  return (
    <div
      className={`
        absolute rounded border shadow-sm cursor-pointer
        transition-colors duration-100 ease-in-out transform
        ${colors.background} ${colors.border} ${colors.text} ${colors.hover}
        active:scale-[0.98] hover:shadow-md 
        overflow-hidden truncate pointer-events-auto
      `}
      style={style}
      onClick={() => onClick(lesson)}
    >
      <div className="text-[11px] p-1 flex flex-col h-full justify-between">
        <div className="font-medium truncate flex justify-between items-center">
          <span className="truncate">
            {lesson.subject?.name || '科目なし'}
          </span>
          <span className="flex-shrink-0 ml-1 font-semibold">
            {startTime}-{endTime}
          </span>
        </div>
        {!isNarrow && (
          <div className="text-[10px] absolute bottom-0.5 left-1 right-1">
            <div className="truncate flex justify-between">
              <span className="truncate">👨‍🏫 {lesson.teacher?.name || '未定'}</span>
              <span className="mx-0.5">-</span>
              <span className="truncate">👨‍🎓 {lesson.student?.name || '未定'}</span>
            </div>
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
    prevProps.lesson.boothId === nextProps.lesson.boothId
  );
});