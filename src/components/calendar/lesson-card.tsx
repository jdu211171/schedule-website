'use client';

import { useEffect, useState, useRef } from 'react';
import { getSubjectName, getTeacherName, getStudentName } from './subjectUtils';

// Определение типа для временного слота
type TimeSlot = {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
};

// Определение типа данных урока
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
  timeSlotHeight?: number; // высота строки комнаты в пикселях
  timeSlots?: TimeSlot[]; // массив временных слотов
};

export default function LessonCard({ 
  lesson, 
  selectedRooms, 
  onClick,
  timeSlotHeight = 40, // значение по умолчанию для высоты строки
  timeSlots = []
}: LessonCardProps) {
  // Состояние для позиционирования карточки
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  
  // Состояние для видимости карточки
  const [isVisible, setIsVisible] = useState(true);
  
  // Ссылка на DOM-элемент карточки
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Константа для ширины столбца комнаты
  const ROOM_COLUMN_WIDTH = 100;
  const COLUMN_WIDTH = 40; // Ширина временной колонки

  // Эффект для вычисления начальной позиции карточки
  useEffect(() => {
    // Находим индекс комнаты в массиве выбранных комнат
    const roomIndex = selectedRooms.indexOf(lesson.room);
    if (roomIndex === -1) return; // Комната не найдена
    
    // Получаем индексы времени начала и конца
    const startHour = lesson.startTime.getHours();
    const startMinute = lesson.startTime.getMinutes();
    const endHour = lesson.endTime.getHours();
    const endMinute = lesson.endTime.getMinutes();
    
    const startTimeIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
    const endTimeIndex = (endHour - 8) * 4 + (endMinute === 0 ? 0 : Math.ceil(endMinute / 15));
    
    // Находим соответствующие ячейки в DOM по атрибуту data-time-col
    const timeCols = document.querySelectorAll('[data-time-col]');
    if (!timeCols || timeCols.length === 0) return;
    
    // Проверяем, что индексы находятся в пределах доступных ячеек
    if (startTimeIndex >= timeCols.length || endTimeIndex - 1 >= timeCols.length) return;
    
    const startCol = timeCols[startTimeIndex];
    const endCol = timeCols[endTimeIndex - 1]; // -1 так как endTimeIndex указывает на следующий слот
    if (!startCol || !endCol) return;
    
    // Получаем позиции ячеек относительно контейнера
    const containerRect = document.querySelector('[data-time-grid-container]')?.getBoundingClientRect();
    if (!containerRect) return;
    
    const startRect = startCol.getBoundingClientRect();
    const endRect = endCol.getBoundingClientRect();
    
    // Рассчитываем точную левую позицию с учетом ширины комнаты
    const left = ROOM_COLUMN_WIDTH + (startTimeIndex * COLUMN_WIDTH);
    
    // Рассчитываем точную ширину в пикселях на основе количества временных слотов
    const width = (endTimeIndex - startTimeIndex) * COLUMN_WIDTH;
    
    // Рассчитываем верхнюю позицию на основе индекса комнаты
    // 40px - высота заголовка с временем
    const top = 40 + roomIndex * timeSlotHeight;
    
    // Устанавливаем позицию карточки
    setPosition({
      top,
      left,
      width,
      height: timeSlotHeight - 2 // Небольшой отступ для визуального разделения
    });
  }, [lesson, selectedRooms, timeSlotHeight]);

  // Эффект для отслеживания видимости при прокрутке
  useEffect(() => {
    if (!position) return;
    
    const handleScroll = () => {
      if (!cardRef.current) return;
      
      const tableContainer = document.querySelector('[data-time-grid-container]')?.parentElement;
      if (!tableContainer) return;
      
      // Находим колонку комнат
      const roomColumn = document.querySelector('.sticky.left-0.w-\\[100px\\]');
      if (!roomColumn) return;
      
      // Получаем размеры и позиции элементов
      const roomRect = roomColumn.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      
      // Карточка должна быть скрыта, если её левый край находится внутри колонки комнат
      // Добавляем буфер в 5px для плавного перехода
      const shouldBeVisible = cardRect.left > roomRect.right - 5;
      
      // Обновляем видимость
      setIsVisible(shouldBeVisible);
    };
    
    // Получаем контейнер с прокруткой
    const tableContainer = document.querySelector('[data-time-grid-container]')?.parentElement;
    if (tableContainer) {
      // Добавляем обработчик события прокрутки
      tableContainer.addEventListener('scroll', handleScroll);
      
      // Выполняем проверку видимости при первой отрисовке
      setTimeout(handleScroll, 0);
      
      // Удаляем обработчик при размонтировании
      return () => {
        tableContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [position]);

  // Если позиция не вычислена, не отображаем карточку
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
        zIndex: isVisible ? 20 : -1, // Меняем z-index в зависимости от видимости
        cursor: 'pointer',
        // Плавное исчезновение при пересечении с колонкой комнат
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.15s ease-out, z-index 0s',
        margin: 0,
        padding: '2px 4px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        e.stopPropagation(); // Останавливаем всплытие события
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