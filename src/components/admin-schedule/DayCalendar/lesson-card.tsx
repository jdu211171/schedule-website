import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClassSession } from '@/hooks/useScheduleClassSessions';
import { TimeSlot } from './day-calendar';

// Определение типа для rooms
interface Room {
  boothId: string;
  name: string;
}

type LessonCardProps = {
  lesson: ClassSession;
  rooms: Room[];
  onClick: (lesson: ClassSession) => void;
  timeSlotHeight?: number;
  timeSlots: TimeSlot[];
};

type CardPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Вынести константы за пределы компонента
const ROOM_COLUMN_WIDTH = 100;
const COLUMN_WIDTH = 40;
const HEADER_HEIGHT = 40;
const BORDER_WIDTH = 1;
const ADJUST_LEFT = 0;
const ADJUST_TOP = 0;
const ADJUST_WIDTH = 0;
const ADJUST_HEIGHT = -1;

// Оптимизированная функция форматирования времени
const formatTimeFromISO = (isoTime: string): string => {
  try {
    if (isoTime.startsWith('1970-01-01T')) {
      const timePart = isoTime.split('T')[1];
      const timeComponents = timePart.split(':');
      return `${timeComponents[0]}:${timeComponents[1]}`;
    } 
    else if (isoTime.includes('T') && isoTime.includes(':')) {
      const date = new Date(isoTime);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (isoTime.includes(':')) {
      return isoTime.split(':').slice(0, 2).join(':');
    }
    return '00:00';
  } catch {
    return '00:00';
  }
};

// Функция получения цвета для типа занятия - вынесена за пределы компонента
const getClassTypeColor = (typeName: string): string => {
  switch(typeName) {
    case '通常授業': return 'bg-blue-500 border-blue-600';
    case '特別授業': return 'bg-red-500 border-red-600';
    case 'テスト対策': return 'bg-purple-500 border-purple-600';
    default: return 'bg-gray-500 border-gray-600';
  }
};

export const LessonCard: React.FC<LessonCardProps> = React.memo(({ 
  lesson, 
  rooms, 
  onClick,
  timeSlotHeight = 40, 
  timeSlots 
}) => {
  const [position, setPosition] = useState<CardPosition | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Мемоизируем форматированное время для избежания повторных вычислений
  const formattedTimes = useMemo(() => {
    return {
      start: formatTimeFromISO(lesson.startTime),
      end: formatTimeFromISO(lesson.endTime)
    };
  }, [lesson.startTime, lesson.endTime]);
  
  // Мемоизируем цвет карточки
  const cardColor = useMemo(() => {
    return getClassTypeColor(lesson.classType?.name || '');
  }, [lesson.classType?.name]);
  
  // Мемоизируем расчет позиции карточки - это самая затратная операция
  useEffect(() => {
    const calculatePosition = () => {
      const boothId = lesson.boothId;
      const roomIndex = rooms.findIndex(room => room.boothId === boothId);
      
      if (roomIndex === -1) {
        return null; 
      }
      
      const startTimeParts = formattedTimes.start.split(':').map(Number);
      const endTimeParts = formattedTimes.end.split(':').map(Number);
      
      const startHour = startTimeParts[0];
      const startMinute = startTimeParts[1];
      const endHour = endTimeParts[0];
      const endMinute = endTimeParts[1];
      
      // Оптимизация: проверяем диапазоны, чтобы избежать ненужных вычислений
      if (startHour < 8 || startHour > 22 || endHour < 8 || endHour > 22) {
        return null;
      }
      
      const startTimeIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
      const endTimeIndex = (endHour - 8) * 4 + (endMinute === 0 ? 0 : Math.ceil(endMinute / 15));
      
      if (startTimeIndex < 0 || endTimeIndex > timeSlots.length) {
        return null;
      }
      
      const left = ROOM_COLUMN_WIDTH + startTimeIndex * COLUMN_WIDTH + ADJUST_LEFT;
      const width = (endTimeIndex - startTimeIndex) * COLUMN_WIDTH + ADJUST_WIDTH;
      const top = HEADER_HEIGHT + roomIndex * timeSlotHeight + ADJUST_TOP;
      const height = timeSlotHeight - BORDER_WIDTH + ADJUST_HEIGHT;
      
      return { top, left, width, height };
    };

    const newPosition = calculatePosition();
    if (newPosition) {
      setPosition(newPosition);
    }
  }, [
    lesson.boothId,
    formattedTimes.start,
    formattedTimes.end,
    rooms,
    timeSlotHeight,
    timeSlots.length
  ]);
  
  // Оптимизация: используем IntersectionObserver вместо обработки скролла
  useEffect(() => {
    if (!cardRef.current || !position) return;
    
    const handleVisibility = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        setIsVisible(entry.isIntersecting);
      });
    };
    
    const observer = new IntersectionObserver(handleVisibility, {
      root: cardRef.current.closest('.overflow-auto'),
      threshold: 0.1
    });
    
    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [position]);

  // Если нет позиции, не рендерим карточку
  if (!position) return null;
  
  return (
    <div
      ref={cardRef}
      className={`${cardColor} rounded-none text-xs overflow-hidden absolute 
        transition-all duration-150 group hover:shadow-md hover:brightness-95 active:brightness-90 pointer-events-auto`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`, 
        width: `${position.width}px`,
        height: `${position.height}px`,
        zIndex: isVisible ? 20 : -1,
        cursor: 'pointer',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-out, z-index 0s',
        margin: 0,
        padding: '2px 4px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        e.stopPropagation(); 
        onClick(lesson);
      }}
    >
      <div className="flex items-center justify-between h-full text-xs text-white">
        <div className="truncate font-semibold">{lesson.subject?.name || 'Без названия'}</div>
        <div className="truncate ml-1">{formattedTimes.start}-{formattedTimes.end}</div>
      </div>
      
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 bg-white rounded-full p-0.5 transform scale-0 group-hover:scale-100 transition-all shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
    </div>
  );
});

// Добавляем displayName для отладки
LessonCard.displayName = 'LessonCard';