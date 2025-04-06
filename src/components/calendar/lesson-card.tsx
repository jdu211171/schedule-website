'use client';

import { useEffect, useState, useRef } from 'react';
import { getSubjectName } from './subjectUtils';

type TimeSlot = {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
};

type Lesson = {
  id: string;
  subject: string;
  teacher: string;
  student: string;
  room: string;
  startTime: Date;
  endTime: Date;
  color: string;
};

type LessonCardProps = {
  lesson: Lesson;
  selectedRooms: string[];
  onClick: (lesson: Lesson) => void;
  timeSlotHeight?: number; 
  timeSlots?: TimeSlot[]; 
};

export default function LessonCard({ 
  lesson, 
  selectedRooms, 
  onClick,
  timeSlotHeight = 40, 
}: LessonCardProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  
  const [isVisible, setIsVisible] = useState(true);
  
  // Ссылка на DOM-элемент карточки
  const cardRef = useRef<HTMLDivElement>(null);
  
  const ROOM_COLUMN_WIDTH = 100;
  const COLUMN_WIDTH = 40; 

  // Эффект для вычисления начальной позиции карточки
  useEffect(() => {
    const roomId = String(lesson.room);
    

    console.log('LessonCard - room ID:', roomId, 'тип:', typeof roomId);
    console.log('LessonCard - selectedRooms:', selectedRooms);
    

    const roomIndex = selectedRooms.findIndex(room => String(room) === roomId);
    console.log('LessonCard - roomIndex:', roomIndex);
    
    if (roomIndex === -1) {
      console.warn(`Комната ${roomId} не найдена в списке выбранных комнат!`);
      return; 
    }
    
    // Получаем индексы времени начала и конца
    const startHour = lesson.startTime.getHours();
    const startMinute = lesson.startTime.getMinutes();
    const endHour = lesson.endTime.getHours();
    const endMinute = lesson.endTime.getMinutes();
    
    console.log('LessonCard - время:', `${startHour}:${startMinute} - ${endHour}:${endMinute}`);
    
    const startTimeIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
    const endTimeIndex = (endHour - 8) * 4 + (endMinute === 0 ? 0 : Math.ceil(endMinute / 15));
    
    console.log('LessonCard - индексы времени:', startTimeIndex, endTimeIndex);
    
    const timeCols = document.querySelectorAll('[data-time-col]');
    if (!timeCols || timeCols.length === 0) {
      console.warn('LessonCard - не найдены временные колонки в DOM');
      return;
    }
    

    if (startTimeIndex >= timeCols.length || endTimeIndex - 1 >= timeCols.length) {
      console.warn('LessonCard - индексы времени вне диапазона доступных колонок');
      return;
    }

    const gridContainer = document.querySelector('[data-time-grid-container]');
    if (!gridContainer) {
      console.warn('LessonCard - не найден контейнер сетки');
      return;
    }
    const left = ROOM_COLUMN_WIDTH + (startTimeIndex * COLUMN_WIDTH);
    const width = (endTimeIndex - startTimeIndex) * COLUMN_WIDTH;
    const top = 25 + roomIndex * timeSlotHeight;
    
    console.log('LessonCard - позиция:', { top, left, width, height: timeSlotHeight - 2 });
    setPosition({
      top,
      left,
      width,
      height: timeSlotHeight - 2 
    });
  }, [lesson, selectedRooms, timeSlotHeight]);

  // Эффект для отслеживания видимости при прокрутке
  useEffect(() => {
    if (!position) return;
    
    const handleScroll = () => {
      if (!cardRef.current) return;
      
      const tableContainer = document.querySelector('[data-time-grid-container]')?.parentElement;
      if (!tableContainer) return;
      const roomColumn = document.querySelector('.sticky.left-0.w-\\[100px\\]');
      if (!roomColumn) return;
      
      // размеры и позиции элементов
      const roomRect = roomColumn.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const shouldBeVisible = cardRect.left > roomRect.right - 5;
      
      setIsVisible(shouldBeVisible);
    };
    
    const tableContainer = document.querySelector('[data-time-grid-container]')?.parentElement;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
      
      setTimeout(handleScroll, 0);
      
      return () => {
        tableContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [position]);
  if (!position) return null;
  
  // Форматирование времени для отображения
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={cardRef}
      className={`${lesson.color} border-0 rounded-md p-1 text-xs shadow-sm overflow-hidden absolute 
        transition-all duration-150 group hover:shadow-md hover:brightness-95 active:brightness-90`}
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
      <div className="flex items-center justify-between h-full text-xs">
        <div className="truncate font-bold">{getSubjectName(lesson.subject)}</div>
        <div className="truncate ml-1">
          {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
        </div>
      </div>
      
      {/* Иконка просмотра - появляется при наведении */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 bg-white rounded-full p-0.5 transform scale-0 group-hover:scale-100 transition-all shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
    </div>
  );
}