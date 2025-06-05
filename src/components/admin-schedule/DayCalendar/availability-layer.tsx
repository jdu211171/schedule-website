import * as React from 'react';
import { useMemo } from 'react';
import { TimeSlot } from './admin-calendar-day';
import { useStudent } from '@/hooks/useStudentQuery';
import { useTeacher } from '@/hooks/useTeacherQuery';

interface AvailabilityLayerProps {
  timeSlots: TimeSlot[];
  booths: { boothId: string; name: string }[];
  teacherAvailability?: boolean[]; // Массив доступности для слотов времени
  studentAvailability?: boolean[]; // Массив доступности для слотов времени
  timeSlotHeight: number;
}

// Цветовая схема
const AVAILABILITY_COLORS = {
  teacher: 'rgba(34, 197, 94, 0.2)',     // Зеленый 20%
  student: 'rgba(251, 191, 36, 0.2)',    // Янтарный 20%
  both: 'rgba(59, 130, 246, 0.4)',       // Синий 40% (заметное пересечение)
  // Темная тема
  teacherDark: 'rgba(34, 197, 94, 0.15)',
  studentDark: 'rgba(251, 191, 36, 0.15)',
  bothDark: 'rgba(59, 130, 246, 0.3)',
};

export const AvailabilityLayer: React.FC<AvailabilityLayerProps> = ({
  timeSlots,
  booths,
  teacherAvailability,
  studentAvailability,
  timeSlotHeight,
}) => {
  // Добавим отладку с идентификацией


  const availabilityBlocks = useMemo(() => {
    const blocks: React.JSX.Element[] = [];
    
    if (!teacherAvailability && !studentAvailability) {
      return blocks;
    }

    // Для каждого временного слота создаем блок в строке заголовка времени
    timeSlots.forEach((slot, slotIndex) => {
      const hasTeacher = teacherAvailability?.[slotIndex] || false;
      const hasStudent = studentAvailability?.[slotIndex] || false;
      
      if (!hasTeacher && !hasStudent) return;

      // Определяем цвет на основе доступности
      let backgroundColor: string;
      if (hasTeacher && hasStudent) {
        backgroundColor = AVAILABILITY_COLORS.both;
      } else if (hasTeacher) {
        backgroundColor = AVAILABILITY_COLORS.teacher;
      } else {
        backgroundColor = AVAILABILITY_COLORS.student;
      }

      // Создаем блок только в строке заголовка (где показано время)
      const key = `availability-header-${slotIndex}`;
      const left = slotIndex * 40; // Позиция по горизонтали
      const top = 0; // В самом верху контейнера
      
      blocks.push(
        <div
          key={key}
          className="absolute pointer-events-none"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: '40px',
            height: `${timeSlotHeight}px`,
            backgroundColor,
            zIndex: 1,
          }}
        />
      );
    });

    return blocks;
  }, [timeSlots, teacherAvailability, studentAvailability, timeSlotHeight]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {availabilityBlocks}
    </div>
  );
};

// Вспомогательная функция для конвертации доступности в массив boolean для слотов
export function convertAvailabilityToSlots(
  availability: {
    timeSlots: {
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
  } | null,
  timeSlots: TimeSlot[]
): boolean[] {
  const result = new Array(timeSlots.length).fill(false);
  
  if (!availability) return result;
  
  if (availability.fullDay) {
    // Если полный день - все слоты доступны
    return new Array(timeSlots.length).fill(true);
  }
  
  // Для каждого доступного временного промежутка
  availability.timeSlots.forEach(({ startTime, endTime }) => {
    // Находим индексы начала и конца
    const startIndex = timeSlots.findIndex(slot => slot.start === startTime);
    let endIndex = timeSlots.findIndex(slot => slot.start === endTime);
    
    // Если не нашли точное совпадение для конца, ищем слот, который заканчивается в это время
    if (endIndex === -1) {
      endIndex = timeSlots.findIndex(slot => slot.end === endTime);
      if (endIndex !== -1) {
        endIndex++; // Включаем этот слот тоже
      }
    }
    
    if (startIndex !== -1) {
      // Если endIndex не найден, заполняем до конца дня или до последнего слота
      const end = endIndex !== -1 ? endIndex : timeSlots.length;
      
      // Помечаем слоты как доступные
      for (let i = startIndex; i < end; i++) {
        if (i < result.length) {
          result[i] = true;
        }
      }
    }
  });
  
  console.log('Converted availability:', {
    availableSlots: result.filter(x => x).length,
    totalSlots: result.length,
    indices: result.map((available, idx) => available ? idx : -1).filter(x => x >= 0)
  });
  
  return result;
}

// Тип для API ответа доступности
export interface AvailabilityResponse {
  regularAvailability: {
    dayOfWeek: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
  }[];
  exceptionalAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
}

// Функция для получения доступности на конкретную дату
export function getAvailabilityForDate(
  date: Date,
  availability: AvailabilityResponse
): {
  timeSlots: { startTime: string; endTime: string }[];
  fullDay: boolean;
} | null {
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay();
  
  // Сначала проверяем исключительную доступность
  const exceptional = availability.exceptionalAvailability.find(
    exc => exc.date === dateStr
  );
  
  if (exceptional) {
    return {
      timeSlots: exceptional.timeSlots,
      fullDay: exceptional.fullDay
    };
  }
  
  // Затем проверяем регулярную доступность
  // Конвертируем день недели в строку (MONDAY, TUESDAY, etc.)
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[dayOfWeek];
  
  const regular = availability.regularAvailability.find(
    reg => reg.dayOfWeek === dayName || reg.dayOfWeek === dayOfWeek.toString()
  );
  
  if (regular) {
    return {
      timeSlots: regular.timeSlots,
      fullDay: regular.fullDay
    };
  }
  
  return null;
}

// Hook для получения доступности учителя и студента
export function useAvailability(
  teacherId: string | undefined,
  studentId: string | undefined,
  date: Date,
  timeSlots: TimeSlot[]
) {
  const { data: teacher } = useTeacher(teacherId || '');
  const { data: student } = useStudent(studentId || '');
  
  const teacherAvailability = useMemo(() => {
    if (!teacher || !teacherId) return undefined;
    
    const availability = getAvailabilityForDate(date, {
      regularAvailability: teacher.regularAvailability || [],
      exceptionalAvailability: teacher.exceptionalAvailability || []
    });
    
    console.log(`Teacher availability for ${date.toISOString().split('T')[0]}:`, availability);
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [teacher, teacherId, date, timeSlots]);
  
  const studentAvailability = useMemo(() => {
    if (!student || !studentId) return undefined;
    
    const availability = getAvailabilityForDate(date, {
      regularAvailability: student.regularAvailability || [],
      exceptionalAvailability: student.exceptionalAvailability || []
    });
    
    console.log(`Student availability for ${date.toISOString().split('T')[0]}:`, availability);
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [student, studentId, date, timeSlots]);
  
  return {
    teacherAvailability,
    studentAvailability
  };
}