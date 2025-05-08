import React, { useState, useEffect, useRef } from 'react';
import { ClassSession } from '@/hooks/useScheduleClassSessions';
import { TimeSlot } from './day-calendar';

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

const formatTimeFromISO = (isoTime: string): string => {
  try {
    if (isoTime.startsWith('1970-01-01T')) {
      const timePart = isoTime.split('T')[1];
      const timeComponents = timePart.split(':');
      const hours = timeComponents[0];
      const minutes = timeComponents[1];
      return `${hours}:${minutes}`;
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
  
  const ROOM_COLUMN_WIDTH = 100;
  const COLUMN_WIDTH = 40;
  const HEADER_HEIGHT = 40;
  const BORDER_WIDTH = 1;
  
  const ADJUST_LEFT = 0;
  const ADJUST_TOP = 0;
  const ADJUST_WIDTH = 0;
  const ADJUST_HEIGHT = -1;

  const formattedStartTime = formatTimeFromISO(lesson.startTime);
  const formattedEndTime = formatTimeFromISO(lesson.endTime);

  useEffect(() => {
    const boothId = lesson.boothId;
    
    const roomIndex = rooms.findIndex(room => room.boothId === boothId);
    
    if (roomIndex === -1) {
      return; 
    }
    
    const startTimeParts = formattedStartTime.split(':').map(Number);
    const endTimeParts = formattedEndTime.split(':').map(Number);
    
    const startHour = startTimeParts[0];
    const startMinute = startTimeParts[1];
    const endHour = endTimeParts[0];
    const endMinute = endTimeParts[1];
    
    const startTimeIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
    const endTimeIndex = (endHour - 8) * 4 + (endMinute === 0 ? 0 : Math.ceil(endMinute / 15));
    
    if (startTimeIndex < 0 || endTimeIndex > timeSlots.length) {
      return;
    }
    
    const left = ROOM_COLUMN_WIDTH + startTimeIndex * COLUMN_WIDTH;
    const width = (endTimeIndex - startTimeIndex) * COLUMN_WIDTH;
    const top = HEADER_HEIGHT + roomIndex * timeSlotHeight;
    const height = timeSlotHeight - BORDER_WIDTH;
    
    const adjustedLeft = left + ADJUST_LEFT;
    const adjustedTop = top + ADJUST_TOP;
    const adjustedWidth = width + ADJUST_WIDTH;
    const adjustedHeight = height + ADJUST_HEIGHT;
    
    setPosition({
      top: adjustedTop,
      left: adjustedLeft,
      width: adjustedWidth,
      height: adjustedHeight
    });
  }, [
    lesson, 
    rooms, 
    timeSlotHeight, 
    timeSlots, 
    formattedStartTime, 
    formattedEndTime, 
    ADJUST_LEFT, 
    ADJUST_TOP, 
    ADJUST_WIDTH, 
    ADJUST_HEIGHT
  ]); 
  
  useEffect(() => {
    if (!position || !cardRef.current) return;
    
    const handleScroll = () => {
      if (!cardRef.current) return;
      
      const tableContainer = cardRef.current.closest('.overflow-auto');
      if (!tableContainer) return;
      
      const roomColumn = tableContainer.querySelector('.sticky.left-0.w-\\[100px\\]');
      if (!roomColumn) return;
      
      const roomRect = roomColumn.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const shouldBeVisible = cardRect.left > roomRect.right - 5;
      
      setIsVisible(shouldBeVisible);
    };
    
    const tableContainer = cardRef.current.closest('.overflow-auto');
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
      
      setTimeout(handleScroll, 0);
      
      return () => {
        tableContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [position, ADJUST_HEIGHT]); 

  const getClassTypeColor = () => {
    const typeName = lesson.classType?.name || '';
    
    switch(typeName) {
      case '通常授業': return 'bg-blue-500 border-blue-600';
      case '特別授業': return 'bg-red-500 border-red-600';
      case 'テスト対策': return 'bg-purple-500 border-purple-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  if (!position) return null;
  
  return (
    <div
      ref={cardRef}
      className={`${getClassTypeColor()} rounded-none text-xs overflow-hidden absolute 
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
        <div className="truncate ml-1">{formattedStartTime}-{formattedEndTime}</div>
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