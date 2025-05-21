import React, { useMemo } from 'react';
import { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';
import { TimeSlot } from './admin-calendar-day';

// Интерфейс для кабинета (booth), учитывающий структуру данных из API
interface Booth {
  boothId: string;
  name?: string;
}

// Расширенный интерфейс для ClassSessionWithRelations, учитывающий данные из API
interface ExtendedClassSession extends ExtendedClassSessionWithRelations {
  teacherName?: string;
  studentName?: string;
  subjectName?: string;
  classTypeName?: string;
  boothName?: string;
  branchName?: string | null
}

interface LessonCardProps {
  lesson: ExtendedClassSession;
  booths: Booth[];
  onClick: (lesson: ExtendedClassSession) => void;
  timeSlotHeight: number;
  timeSlots: TimeSlot[];
  maxZIndex?: number;
}

// Улучшенная функция извлечения времени
const extractTime = (timeValue: string | Date | undefined): string => {
  if (!timeValue) return '';
  
  try {
    if (typeof timeValue === 'string') {
      // Если формат времени уже "HH:MM" (как в API)
      if (/^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      
      // Для ISO формата
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
  maxZIndex = 10 
}) => {
  const startTime = useMemo(() => extractTime(lesson.startTime), [lesson.startTime]);
  const endTime = useMemo(() => extractTime(lesson.endTime), [lesson.endTime]);
  
  // Находим ближайший временной слот для начала урока
  const startSlotIndex = useMemo(() => {
    const exactMatch = timeSlots.findIndex(slot => slot.start === startTime);
    if (exactMatch >= 0) return exactMatch;
    
    // Если точного совпадения нет, ищем ближайший слот
    return timeSlots.findIndex(slot => {
      const slotTime = slot.start.split(':').map(Number);
      const startTimeArr = startTime.split(':').map(Number);
      
      if (!slotTime[0] || !startTimeArr[0]) return false;
      
      const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
      const startMinutes = startTimeArr[0] * 60 + (startTimeArr[1] || 0);
      
      return slotMinutes <= startMinutes && startMinutes < (slotMinutes + 30);
    });
  }, [startTime, timeSlots]);
  
  // Находим ближайший временной слот для окончания урока
  const endSlotIndex = useMemo(() => {
    const exactMatch = timeSlots.findIndex(slot => slot.start === endTime);
    if (exactMatch >= 0) return exactMatch;
    
    // Если точного совпадения нет, ищем ближайший слот
    const matchedIndex = timeSlots.findIndex(slot => {
      const slotTime = slot.start.split(':').map(Number);
      const endTimeArr = endTime.split(':').map(Number);
      
      if (!slotTime[0] || !endTimeArr[0]) return false;
      
      const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
      const endMinutes = endTimeArr[0] * 60 + (endTimeArr[1] || 0);
      
      return slotMinutes <= endMinutes && endMinutes < (slotMinutes + 30);
    });
    
    return matchedIndex >= 0 ? matchedIndex : startSlotIndex + 3; // Если не нашли, берем +3 слота от начала (1.5 часа)
  }, [endTime, timeSlots, startSlotIndex]);
  
  // Находим индекс кабинета
  const boothIndex = useMemo(() => {
    // Точное совпадение по boothId
    const exactMatch = booths.findIndex(booth => booth.boothId === lesson.boothId);
    if (exactMatch >= 0) return exactMatch;
    
    // Если не нашли, проверяем по имени кабинета
    const nameMatch = booths.findIndex(booth => 
      booth.name === lesson.boothName || 
      (typeof lesson.booth === 'object' && lesson.booth && booth.name === lesson.booth.name)
    );
    
    return nameMatch >= 0 ? nameMatch : 0; // Если ни одно не совпало, используем первый кабинет
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
    
    // Расчет продолжительности урока в минутах
    const calculateDurationInSlots = () => {
      if (!startTime || !endTime) return 3; // По умолчанию 1.5 часа (3 слота по 30 минут)
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        return 3;
      }
      
      const durationMinutes = ((endHour - startHour) * 60) + (endMin - startMin);
      return Math.max(1, Math.ceil(durationMinutes / 30)); // Предполагаем, что один слот = 30 минут
    };
    
    // Вычисляем примерную продолжительность урока
    const durationSlots = calculateDurationInSlots();
    
    // Если не удалось определить позицию, но у нас есть время начала
    // Пытаемся определить ближайший слот
    if (startTime) {
      const [hour, minute] = startTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        // Ищем ближайший слот по времени
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
    
    // Если все методы не сработали, используем начало дня и стандартную продолжительность
    return {
      effectiveStartIndex: 0, // Начало дня
      effectiveDuration: durationSlots
    };
  }, [isValidPosition, startSlotIndex, endSlotIndex, startTime, endTime, timeSlots, lesson.classId, boothIndex, lesson.boothId]);
  
  const colors = useMemo(() => {
    // Определяем, является ли урок обычным на основе типа класса
    const isRegularLesson = lesson.classType?.name === '通常授業' || 
                           lesson.classTypeName === '通常授業';
    
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
  }, [lesson.classType?.name, lesson.classTypeName]);
  
  // Рассчитываем CSS стиль
  const style = useMemo(() => ({
    position: 'absolute',
    left: `${effectiveStartIndex * 40 + 100}px`,
    top: `${(boothIndex + 1) * timeSlotHeight}px`,
    width: `${effectiveDuration * 40}px`,
    height: `${timeSlotHeight - 2}px`,
    zIndex: maxZIndex - 1
  } as React.CSSProperties), [effectiveStartIndex, effectiveDuration, boothIndex, timeSlotHeight, maxZIndex]);
  
  const isNarrow = effectiveDuration <= 1;
  
  // Защита от рендеринга вне видимой области
  if (effectiveStartIndex < 0) {
    console.error('Невозможно отобразить урок - недопустимый индекс начала:', effectiveStartIndex);
    return null;
  }

  // Используем данные как из вложенных объектов, так и из плоских свойств (как в API)
  const subjectName = lesson.subject?.name || lesson.subjectName || 'Предмет не указан';
  const teacherName = lesson.teacher?.name || lesson.teacherName || 'Преподаватель не указан';
  const studentName = lesson.student?.name || lesson.studentName || 'Студент не указан';

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
            {subjectName}
          </span>
          <span className="flex-shrink-0 ml-1 font-semibold">
            {startTime}-{endTime}
          </span>
        </div>
        {!isNarrow && (
          <div className="text-[11px] absolute bottom-0.5 left-1 right-1">
            <div className="truncate flex justify-between">
              <span className="truncate">👨‍🏫 {teacherName}</span>
              <span className="mx-0.5">-</span>
              <span className="truncate">👨‍🎓 {studentName}</span>
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