import * as React from 'react';
import { useMemo } from 'react';
import { TimeSlot } from './admin-calendar-day';
import { useStudent } from '@/hooks/useStudentQuery';
import { useTeacher } from '@/hooks/useTeacherQuery';

interface AvailabilityLayerProps {
  timeSlots: TimeSlot[];
  booths: { boothId: string; name: string }[];
  teacherAvailability?: boolean[];
  studentAvailability?: boolean[];
  timeSlotHeight: number;
}

const AVAILABILITY_COLORS = {
  teacher: 'rgba(59, 130, 246, 0.2)',
  student: 'rgba(251, 191, 36, 0.2)',
  both: 'rgba(34, 197, 94, 0.4)',
  teacherDark: 'rgba(59, 130, 246, 0.15)',
  studentDark: 'rgba(251, 191, 36, 0.15)',
  bothDark: 'rgba(34, 197, 94, 0.3)',
};

export const AvailabilityLayer: React.FC<AvailabilityLayerProps> = ({
  timeSlots,
  booths,
  teacherAvailability,
  studentAvailability,
  timeSlotHeight,
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
        backgroundColor = AVAILABILITY_COLORS.both;
      } else if (hasTeacher) {
        backgroundColor = AVAILABILITY_COLORS.teacher;
      } else {
        backgroundColor = AVAILABILITY_COLORS.student;
      }

      const key = `availability-header-${slotIndex}`;
      const left = slotIndex * 40;
      const top = 0;
      
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

export function getAvailabilityForDate(
  date: Date,
  availability: AvailabilityResponse
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
  
  if (exceptional) {
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
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [teacher, teacherId, date, timeSlots]);
  
  const studentAvailability = useMemo(() => {
    if (!student || !studentId) return undefined;
    
    const availability = getAvailabilityForDate(date, {
      regularAvailability: student.regularAvailability || [],
      exceptionalAvailability: student.exceptionalAvailability || []
    });
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [student, studentId, date, timeSlots]);
  
  return {
    teacherAvailability,
    studentAvailability
  };
}