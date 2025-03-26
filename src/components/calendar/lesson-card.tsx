'use client';

import { useEffect, useState } from 'react';
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
  horizontalLayout?: boolean; // флаг для горизонтального отображения
  timeSlots?: TimeSlot[]; // массив временных слотов
  scrollLeft?: number; // информация о текущей прокрутке
};

export default function LessonCard({ 
  lesson, 
  selectedRooms, 
  onClick,
  timeSlotHeight = 40, // значение по умолчанию для высоты строки
  horizontalLayout = true, // по умолчанию используем горизонтальное отображение
  timeSlots = [],
  scrollLeft = 0 // значение прокрутки по умолчанию
}: LessonCardProps) {
  // Позиционирование карточки
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Вычисление позиции карточки на основе времени и комнаты
  useEffect(() => {
    // Нам нужно определить позицию в зависимости от layoutа
    if (horizontalLayout) {
      // Горизонтальное отображение (время по горизонтали)
      
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
      
      const startCol = timeCols[startTimeIndex];
      const endCol = timeCols[endTimeIndex - 1]; // -1 так как endTimeIndex указывает на следующий слот
      if (!startCol || !endCol) return;
      
      // Получаем позиции ячеек относительно контейнера
      const containerRect = document.querySelector('[data-time-grid-container]')?.getBoundingClientRect();
      if (!containerRect) return;
      
      const startRect = startCol.getBoundingClientRect();
      const endRect = endCol.getBoundingClientRect();
      
      // Рассчитываем позицию и размеры карточки
      const left = startRect.left - containerRect.left;
      // Добавляем ширину последней ячейки для получения правильной ширины
      const width = (endRect.right - startRect.left);
      
      // Устанавливаем позицию карточки
      setPosition({
        top: 40 + roomIndex * timeSlotHeight, // 40px - высота заголовка с временем
        left,
        width,
        height: timeSlotHeight - 2 // небольшой отступ для визуального разделения
      });
    } else {
      // Вертикальное отображение (время по вертикали) - оригинальная логика
      const startHour = lesson.startTime.getHours();
      const startMinute = lesson.startTime.getMinutes();
      const endHour = lesson.endTime.getHours();
      const endMinute = lesson.endTime.getMinutes();
      
      const startTimeIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
      const endTimeIndex = (endHour - 8) * 4 + (endMinute === 0 ? -1 : Math.ceil(endMinute / 15) - 1);
      
      // Находим индекс комнаты в массиве выбранных комнат
      const roomIndex = selectedRooms.indexOf(lesson.room);
      if (roomIndex === -1) return; // Комната не найдена
      
      // Находим соответствующие строки в DOM для начала и конца урока
      const rows = document.querySelectorAll('[data-time-row]');
      if (!rows || rows.length === 0) return;
      
      const startRow = rows[startTimeIndex];
      const endRow = rows[endTimeIndex];
      if (!startRow || !endRow) return;
      
      // Получаем позиции строк относительно контейнера
      const containerRect = document.querySelector('[data-time-grid-container]')?.getBoundingClientRect();
      if (!containerRect) return;
      
      const startRect = startRow.getBoundingClientRect();
      const endRect = endRow.getBoundingClientRect();
      
      const top = startRect.top - containerRect.top;
      // Используем высоту до конца выбранного слота
      const height = (endRect.top - startRect.top) + (endMinute === 0 ? 0 : timeSlotHeight);
      
      // Ширина ячейки комнаты (стандартно 100px, но оставляем немного места для отступов)
      const cardWidth = 98;
      
      // Устанавливаем позицию карточки
      setPosition({
        top,
        left: 100 + roomIndex * 100, // 100px - ширина первого столбца с временем
        width: cardWidth,
        height
      });
    }
  }, [lesson, selectedRooms, timeSlotHeight, horizontalLayout]);

  // Если позиция не вычислена, не отображаем карточку
  if (!position) return null;
  
  // Проверяем видимость карточки относительно прокрутки
  // Если левый край карточки меньше 100px (ширина колонки комнат) + прокрутка, скрываем карточку
  const isVisible = position.left - scrollLeft >= 100;
  
  // Форматирование времени для отображения
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Получаем имена учителя и ученика из утилит
  const teacherName = getTeacherName(lesson.teacher);
  const studentName = getStudentName(lesson.student);
  
  // Содержимое карточки зависит от ориентации
  const renderContent = () => {
    if (horizontalLayout) {
      // Для горизонтального отображения (компактный вид)
      return (
        <>
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
        </>
      );
    } else {
      // Для вертикального отображения (полный вид)
      return (
        <>
          {/* Визуальный индикатор наведения */}
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity" />
          
          {/* Иконка просмотра - появляется при наведении */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 bg-white rounded-full p-0.5 transform scale-0 group-hover:scale-100 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          
          {/* Содержимое карточки */}
          <div className="font-bold truncate">{getSubjectName(lesson.subject)}</div>
          <div className="truncate">講師: {teacherName}</div>
          <div className="truncate">生徒: {studentName}</div>
          <div className="text-xs opacity-75 truncate">
            {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
          </div>
        </>
      );
    }
  };

  return (
    <div 
      className={`${lesson.color} border rounded-md p-1 text-xs shadow overflow-hidden absolute 
        transition-all duration-150 group hover:shadow-md hover:brightness-95 active:brightness-90`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`, 
        width: `${position.width}px`,
        height: `${position.height}px`,
        zIndex: 20, // Устанавливаем z-index ниже, чем у фиксированной колонки комнат (40)
        cursor: 'pointer',
        // При перекрытии с колонкой комнат скрываем карточку
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.1s ease-out'
      }}
      onClick={(e) => {
        e.stopPropagation(); // Останавливаем всплытие события
        onClick(lesson);
      }}
    >
      {renderContent()}
    </div>
  );
}