import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  maxZIndex?: number;
};

type CardPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Константы вынесены за пределы компонента
const ROOM_COLUMN_WIDTH = 100;
const COLUMN_WIDTH = 40;
const HEADER_HEIGHT = 40;
const BORDER_WIDTH = 1;
const ADJUST_LEFT = 0;
const ADJUST_TOP = 0;
const ADJUST_WIDTH = 0;
const ADJUST_HEIGHT = -1;

// Кэш цветов для более эффективного рендеринга
const colorCache = new Map<string, string>();

/**
 * Determines card color based on lesson type and source (template or not)
 * With caching for better performance
 */
const getClassTypeColor = (typeName: string, isTemplateInstance: boolean): string => {
  const cacheKey = `${typeName}-${isTemplateInstance}`;
  
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }
  
  let color;
  if (typeName === '通常授業' || isTemplateInstance) {
    color = 'bg-blue-500 border-blue-600'; // Regular lessons - blue
  } else if (typeName === '特別補習') {
    color = 'bg-red-500 border-red-600'; // Special lessons - red
  } else {
    color = 'bg-gray-500 border-gray-600'; // All others - gray
  }
  
  colorCache.set(cacheKey, color);
  return color;
};

export const LessonCard: React.FC<LessonCardProps> = React.memo(({ 
  lesson, 
  rooms, 
  onClick,
  timeSlotHeight = 40, 
  timeSlots,
  maxZIndex = 4
}) => {
  const [position, setPosition] = useState<CardPosition | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Determine if the lesson is based on a template - вычисляем только один раз
  const isTemplateInstance = useMemo(() => Boolean(lesson.regularClassTemplate), [lesson.regularClassTemplate]);
  
  // Format times from UTC to Japan time - вычисляем только один раз
  const formattedTimes = useMemo(() => {
    const start = formatToJapanTime(lesson.startTime);
    const end = formatToJapanTime(lesson.endTime);
    return { start, end };
  }, [lesson.startTime, lesson.endTime]);
  
  // Card color - вычисляем только один раз
  const cardColor = useMemo(() => {
    return getClassTypeColor(lesson.classType?.name || '', isTemplateInstance);
  }, [lesson.classType?.name, isTemplateInstance]);
  
  // Names - вычисляем только один раз
  const teacherName = useMemo(() => lesson.teacher?.name || '教師不明', [lesson.teacher]);
  const studentName = useMemo(() => lesson.student?.name || '生徒不明', [lesson.student]);
  const subjectName = useMemo(() => lesson.subject?.name || '不明', [lesson.subject]);
  
  // Оптимизированная функция вычисления позиции
  const calculatePosition = useCallback(() => {
    const boothId = lesson.boothId;
    const roomIndex = rooms.findIndex(room => room.boothId === boothId);
    
    if (roomIndex === -1) {
      console.warn(`Room with ID ${boothId} not found for lesson ${lesson.classId}`);
      return null; 
    }
    
    if (!isTimeInDisplayRange(formattedTimes.start) || !isTimeInDisplayRange(formattedTimes.end)) {
      return null;
    }
    
    const startTimeIndex = calculateTimeSlotIndex(formattedTimes.start);
    const endTimeIndex = calculateTimeSlotIndex(formattedTimes.end);
    
    if (startTimeIndex < 0 || endTimeIndex > timeSlots.length) {
      return null;
    }
    
    // Calculate position and size of the card
    const left = ROOM_COLUMN_WIDTH + startTimeIndex * COLUMN_WIDTH + ADJUST_LEFT;
    const width = (endTimeIndex - startTimeIndex) * COLUMN_WIDTH + ADJUST_WIDTH;
    const top = HEADER_HEIGHT + roomIndex * timeSlotHeight + ADJUST_TOP;
    const height = timeSlotHeight - BORDER_WIDTH + ADJUST_HEIGHT;
    
    return { top, left, width, height };
  }, [
    lesson.boothId,
    lesson.classId,
    formattedTimes.start,
    formattedTimes.end,
    rooms,
    timeSlotHeight,
    timeSlots.length
  ]);
  
  // Вычисляем позицию только при изменении зависимостей
  useEffect(() => {
    const newPosition = calculatePosition();
    if (newPosition) {
      setPosition(newPosition);
    }
  }, [calculatePosition]);
  
  // Мемоизированный обработчик клика
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); 
    onClick(lesson);
  }, [onClick, lesson]);
  
  // Observer to track card visibility с оптимизацией опций
  useEffect(() => {
    if (!cardRef.current || !position) return;
    
    const handleVisibility = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry) {
        // Обновляем состояние только при изменении видимости
        if (entry.isIntersecting !== isVisible) {
          setIsVisible(entry.isIntersecting);
        }
      }
    };
    
    // Оптимизированные опции для IntersectionObserver
    const options = {
      root: cardRef.current.closest('.overflow-auto'),
      threshold: 0.1,
      rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver(handleVisibility, options);
    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [position, isVisible]);

  // Ничего не рендерим, если не можем определить позицию
  if (!position) return null;
  
  // Объединение стилей для оптимизации ререндеринга - Исправлено с правильной типизацией
  const cardStyle: React.CSSProperties = {
    top: `${position.top}px`,
    left: `${position.left}px`, 
    width: `${position.width}px`,
    height: `${position.height}px`,
    zIndex: isVisible ? maxZIndex : -1,
    cursor: 'pointer',
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none',
    transition: 'opacity 0.15s ease-out',
    margin: 0,
    padding: '2px 4px',
    boxSizing: 'border-box'
  };
  
  return (
    <div
      ref={cardRef}
      className={`${cardColor} rounded-none text-xs overflow-hidden absolute 
        transition-all duration-150 group hover:shadow-md hover:brightness-95 active:brightness-90 pointer-events-auto`}
      style={cardStyle}
      onClick={handleClick}
    >
      <div className="flex flex-col justify-between h-full text-xs text-white">
        <div className="flex justify-between items-center">
          <div className="truncate font-semibold">
            {subjectName}
            {isTemplateInstance && (
              <span className="ml-1 inline-block w-2 h-2 rounded-full bg-yellow-300" title="テンプレートからの授業"></span>
            )}
          </div>
          <div className="truncate text-xs whitespace-nowrap">{formattedTimes.start}-{formattedTimes.end}</div>
        </div>
        
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
}, (prevProps, nextProps) => {
  // Оптимизированная функция сравнения для React.memo
  // Мы сравниваем только те свойства, которые влияют на рендеринг
  return (
    prevProps.lesson.classId === nextProps.lesson.classId &&
    prevProps.lesson.boothId === nextProps.lesson.boothId &&
    prevProps.lesson.startTime === nextProps.lesson.startTime &&
    prevProps.lesson.endTime === nextProps.lesson.endTime &&
    prevProps.timeSlotHeight === nextProps.timeSlotHeight &&
    prevProps.maxZIndex === nextProps.maxZIndex &&
    // Не сравниваем полностью массивы rooms и timeSlots
    // а только их длины, так как это влияет на позиционирование
    prevProps.rooms.length === nextProps.rooms.length &&
    prevProps.timeSlots.length === nextProps.timeSlots.length
  );
});

LessonCard.displayName = 'LessonCard';