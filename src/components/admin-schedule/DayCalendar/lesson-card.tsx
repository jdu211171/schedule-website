import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { TimeSlot } from './admin-calendar-day';
import { formatToJapanTime, isTimeInDisplayRange, calculateTimeSlotIndex } from '../date';

interface Room {
  boothId: string;
  name: string;
}

type LessonCardProps = {
  lesson: ClassSessionWithRelations;
  rooms: Room[];
  onClick: (lesson: ClassSessionWithRelations) => void;
  timeSlotHeight?: number;
  timeSlots: TimeSlot[];
};

type CardPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const ROOM_COLUMN_WIDTH = 100;
const COLUMN_WIDTH = 40;
const HEADER_HEIGHT = 40;
const BORDER_WIDTH = 1;
const ADJUST_LEFT = 0;
const ADJUST_TOP = 0;
const ADJUST_WIDTH = 0;
const ADJUST_HEIGHT = -1;

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
  
  
  // Форматируем время из UTC в японское время
  const formattedTimes = useMemo(() => {
    const start = formatToJapanTime(lesson.startTime);
    const end = formatToJapanTime(lesson.endTime);
    
    console.log(`Formatted times for lesson ${lesson.classId}: ${start}-${end} (Japan time)`);
    
    return { start, end };
  }, [lesson.startTime, lesson.endTime, lesson.classId]);
  
  const cardColor = useMemo(() => {
    return getClassTypeColor(lesson.classType?.name || '');
  }, [lesson.classType?.name]);
  
  const teacherName = useMemo(() => lesson.teacher?.name || '教師不明', [lesson.teacher]);
  const studentName = useMemo(() => lesson.student?.name || '生徒不明', [lesson.student]);
  
  // Мемоизируем расчет позиции карточки - это самая затратная операция
  useEffect(() => {
    const calculatePosition = () => {
      const boothId = lesson.boothId;
      const roomIndex = rooms.findIndex(room => room.boothId === boothId);
      
      if (roomIndex === -1) {
        console.warn(`Room with ID ${boothId} not found for lesson ${lesson.classId}`);
        return null; 
      }
      
      if (!isTimeInDisplayRange(formattedTimes.start) || !isTimeInDisplayRange(formattedTimes.end)) {
        console.warn(`Time out of display range for lesson ${lesson.classId}: ${formattedTimes.start}-${formattedTimes.end}`);
        return null;
      }
      
      const startTimeIndex = calculateTimeSlotIndex(formattedTimes.start);
      const endTimeIndex = calculateTimeSlotIndex(formattedTimes.end);
      
      if (startTimeIndex < 0 || endTimeIndex > timeSlots.length) {
        console.warn(`Time index out of bounds for lesson ${lesson.classId}`);
        return null;
      }
      
      // Вычисляем позицию и размеры карточки
      const left = ROOM_COLUMN_WIDTH + startTimeIndex * COLUMN_WIDTH + ADJUST_LEFT;
      const width = (endTimeIndex - startTimeIndex) * COLUMN_WIDTH + ADJUST_WIDTH;
      const top = HEADER_HEIGHT + roomIndex * timeSlotHeight + ADJUST_TOP;
      const height = timeSlotHeight - BORDER_WIDTH + ADJUST_HEIGHT;
      
      return { top, left, width, height };
    };

    const newPosition = calculatePosition();
    if (newPosition) {
      setPosition(newPosition);
    } else {
      console.warn(`Could not calculate position for lesson ${lesson.classId}`);
    }
  }, [
    lesson.boothId,
    lesson.classId,
    formattedTimes.start,
    formattedTimes.end,
    rooms,
    timeSlotHeight,
    timeSlots.length
  ]);
  
  // Наблюдатель для отслеживания видимости карточки
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
      <div className="flex flex-col justify-between h-full text-xs text-white">
        <div className="flex justify-between items-center">
          <div className="truncate font-semibold">{lesson.subject?.name || '不明'}</div>
          <div className="truncate text-xs whitespace-nowrap">{formattedTimes.start}-{formattedTimes.end}</div>
        </div>
        
        {/* Имена учителя и студента */}
        <div className="flex justify-between items-center text-xs opacity-80">
          <div className="truncate">👨‍🏫 {teacherName}</div>
          <div className="truncate">👨‍🎓 {studentName}</div>
        </div>
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

LessonCard.displayName = 'LessonCard';