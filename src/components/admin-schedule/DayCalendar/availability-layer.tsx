import * as React from 'react';
import { useMemo } from 'react';
import { TimeSlot } from './day-calendar';
import { useStudent } from '@/hooks/useStudentQuery';
import { useTeacher } from '@/hooks/useTeacherQuery';

type AvailabilityMode = 'with-special' | 'regular-only';

interface AvailabilityLayerProps {
  timeSlots: TimeSlot[];
  booths: { boothId: string; name: string }[];
  teacherAvailability?: boolean[];
  studentAvailability?: boolean[];
  timeSlotHeight: number;
  availabilityMode?: AvailabilityMode;
}

const AVAILABILITY_COLORS = {
  teacher: 'rgba(59, 130, 246, 0.2)',
  student: 'rgba(251, 191, 36, 0.2)',
  both: 'rgba(34, 197, 94, 0.4)',
  teacherDark: 'rgba(59, 130, 246, 0.15)',
  studentDark: 'rgba(251, 191, 36, 0.15)',
  bothDark: 'rgba(34, 197, 94, 0.3)',
  // Цвета для режима "только обычные" (немного светлее)
  teacherRegular: 'rgba(59, 130, 246, 0.15)',
  studentRegular: 'rgba(251, 191, 36, 0.15)',
  bothRegular: 'rgba(34, 197, 94, 0.3)',
  teacherRegularDark: 'rgba(59, 130, 246, 0.1)',
  studentRegularDark: 'rgba(251, 191, 36, 0.1)',
  bothRegularDark: 'rgba(34, 197, 94, 0.2)',
};

export const AvailabilityLayer: React.FC<AvailabilityLayerProps> = ({
  timeSlots,
  booths,
  teacherAvailability,
  studentAvailability,
  timeSlotHeight,
  availabilityMode = 'with-special',
}) => {
  const availabilityBlocks = useMemo(() => {
    const blocks: React.JSX.Element[] = [];
    
    if (!teacherAvailability && !studentAvailability) {
      return blocks;
    }

    timeSlots.forEach((slot, slotIndex) => {
      const hasTeacher = teacherAvailability?.[slotIndex] || false;
      const hasStudent = studentAvailability?.[slotIndex] || false;
      
      if (!hasTeacher && !hasStudent) return;

      let backgroundColor: string;
      
      if (hasTeacher && hasStudent) {
        backgroundColor = availabilityMode === 'with-special' 
          ? AVAILABILITY_COLORS.both 
          : AVAILABILITY_COLORS.bothRegular;
      } else if (hasTeacher) {
        backgroundColor = availabilityMode === 'with-special' 
          ? AVAILABILITY_COLORS.teacher 
          : AVAILABILITY_COLORS.teacherRegular;
      } else {
        backgroundColor = availabilityMode === 'with-special' 
          ? AVAILABILITY_COLORS.student 
          : AVAILABILITY_COLORS.studentRegular;
      }

      const key = `availability-header-${slotIndex}`;
      const left = slotIndex * 50;
      const top = 0;
      
      blocks.push(
        <div
          key={key}
          className="absolute pointer-events-none"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: '50px',
            height: `${timeSlotHeight}px`,
            backgroundColor,
            zIndex: 1,
          }}
        />
      );
    });

    return blocks;
  }, [timeSlots, teacherAvailability, studentAvailability, timeSlotHeight, availabilityMode]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {availabilityBlocks}
    </div>
  );
};

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
    return new Array(timeSlots.length).fill(true);
  }
  
  availability.timeSlots.forEach(({ startTime, endTime }) => {
    const startIndex = timeSlots.findIndex(slot => slot.start === startTime);
    let endIndex = timeSlots.findIndex(slot => slot.start === endTime);
    
    if (endIndex === -1) {
      endIndex = timeSlots.findIndex(slot => slot.end === endTime);
      if (endIndex !== -1) {
        endIndex++;
      }
    }
    
    if (startIndex !== -1) {
      const end = endIndex !== -1 ? endIndex : timeSlots.length;
      
      for (let i = startIndex; i < end; i++) {
        if (i < result.length) {
          result[i] = true;
        }
      }
    }
  });
  
  return result;
}

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

// Обновленная функция с поддержкой режима
export function getAvailabilityForDate(
  date: Date,
  availability: AvailabilityResponse,
  mode: AvailabilityMode = 'with-special'
): {
  timeSlots: { startTime: string; endTime: string }[];
  fullDay: boolean;
} | null {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const exceptional = availability.exceptionalAvailability.find(
    exc => exc.date === dateStr
  );
  
  // В режиме "только обычные" игнорируем особые предпочтения (токубецу кибоу)
  if (exceptional && mode === 'with-special') {
    return {
      timeSlots: exceptional.timeSlots,
      fullDay: exceptional.fullDay
    };
  }
  
  const dayOfWeek = date.getDay();
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[dayOfWeek];
  
  const regular = availability.regularAvailability.find(
    reg => reg.dayOfWeek === dayName
  );
  
  if (regular) {
    return {
      timeSlots: regular.timeSlots,
      fullDay: regular.fullDay
    };
  }
  
  return null;
}

// Обновленный хук с поддержкой режима
export function useAvailability(
  teacherId: string | undefined,
  studentId: string | undefined,
  date: Date,
  timeSlots: TimeSlot[],
  availabilityMode: AvailabilityMode = 'with-special'
) {
  const { data: teacher } = useTeacher(teacherId || '');
  const { data: student } = useStudent(studentId || '');
  
  const teacherAvailability = useMemo(() => {
    if (!teacher || !teacherId) return undefined;
    
    const availability = getAvailabilityForDate(date, {
      regularAvailability: teacher.regularAvailability || [],
      exceptionalAvailability: teacher.exceptionalAvailability || []
    }, availabilityMode);
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [teacher, teacherId, date, timeSlots, availabilityMode]);
  
  const studentAvailability = useMemo(() => {
    if (!student || !studentId) return undefined;
    
    const availability = getAvailabilityForDate(date, {
      regularAvailability: student.regularAvailability || [],
      exceptionalAvailability: student.exceptionalAvailability || []
    }, availabilityMode);
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [student, studentId, date, timeSlots, availabilityMode]);
  
  return {
    teacherAvailability,
    studentAvailability
  };
}