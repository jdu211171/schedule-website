"use client";

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
  cellWidth?: number;
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
  cellWidth = 50,
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
      const left = slotIndex * cellWidth;
      const top = 0;
      
      blocks.push(
        <div
          key={key}
          className="absolute pointer-events-none"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${cellWidth}px`,
            height: `${timeSlotHeight}px`,
            backgroundColor,
            zIndex: 1,
          }}
        />
      );
    });

    return blocks;
  }, [timeSlots, teacherAvailability, studentAvailability, timeSlotHeight, availabilityMode, cellWidth]);

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
  absenceAvailability?: {
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
    const base = { timeSlots: exceptional.timeSlots, fullDay: exceptional.fullDay };
    return applyAbsences(base, availability.absenceAvailability, dateStr);
  }
  
  const dayOfWeek = date.getDay();
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[dayOfWeek];
  
  const regular = availability.regularAvailability.find(
    reg => reg.dayOfWeek === dayName
  );
  
  if (regular) {
    const base = { timeSlots: regular.timeSlots, fullDay: regular.fullDay };
    return applyAbsences(base, availability.absenceAvailability, dateStr);
  }
  
  return null;
}

function applyAbsences(
  base: { timeSlots: { startTime: string; endTime: string }[]; fullDay: boolean },
  absences: AvailabilityResponse['absenceAvailability'] | undefined,
  dateStr: string
) {
  if (!absences || absences.length === 0) return base;
  const absence = absences.find(a => a.date === dateStr);
  if (!absence) return base;

  if (absence.fullDay) {
    return { timeSlots: [], fullDay: false };
  }

  const remaining = subtractSlots(base.timeSlots, absence.timeSlots);
  return { timeSlots: remaining, fullDay: false };
}

function toMin(t: string) { const [h,m] = t.split(':').map(Number); return h*60+m; }
function fromMin(n: number) {
  const h = Math.floor(n/60); const m = n%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function subtractSlots(base: { startTime: string; endTime: string }[], sub: { startTime: string; endTime: string }[]) {
  let remaining = mergeSlots(base);
  const subtractors = mergeSlots(sub);
  for (const s of subtractors) {
    const sStart = toMin(s.startTime); const sEnd = toMin(s.endTime);
    const next: { startTime: string; endTime: string }[] = [];
    for (const b of remaining) {
      const bStart = toMin(b.startTime); const bEnd = toMin(b.endTime);
      if (sEnd <= bStart || sStart >= bEnd) { next.push(b); continue; }
      if (sStart <= bStart && sEnd >= bEnd) { continue; }
      if (sStart <= bStart && sEnd < bEnd) { next.push({ startTime: fromMin(sEnd), endTime: fromMin(bEnd) }); continue; }
      if (sStart > bStart && sEnd >= bEnd) { next.push({ startTime: fromMin(bStart), endTime: fromMin(sStart) }); continue; }
      if (sStart > bStart && sEnd < bEnd) { next.push({ startTime: fromMin(bStart), endTime: fromMin(sStart) }); next.push({ startTime: fromMin(sEnd), endTime: fromMin(bEnd) }); continue; }
    }
    remaining = mergeSlots(next);
    if (remaining.length === 0) break;
  }
  return remaining;
}

function mergeSlots(slots: { startTime: string; endTime: string }[]) {
  if (slots.length <= 1) return [...slots];
  const sorted = [...slots].sort((a,b) => toMin(a.startTime) - toMin(b.startTime));
  const merged: { startTime: string; endTime: string }[] = [sorted[0]];
  for (let i=1;i<sorted.length;i++){
    const last = merged[merged.length-1];
    if (toMin(sorted[i].startTime) <= toMin(last.endTime)) {
      last.endTime = fromMin(Math.max(toMin(last.endTime), toMin(sorted[i].endTime)));
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
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
      exceptionalAvailability: teacher.exceptionalAvailability || [],
      absenceAvailability: (teacher as any).absenceAvailability || []
    }, availabilityMode);
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [teacher, teacherId, date, timeSlots, availabilityMode]);
  
  const studentAvailability = useMemo(() => {
    if (!student || !studentId) return undefined;
    
    const availability = getAvailabilityForDate(date, {
      regularAvailability: student.regularAvailability || [],
      exceptionalAvailability: student.exceptionalAvailability || [],
      absenceAvailability: (student as any).absenceAvailability || []
    }, availabilityMode);
    
    return convertAvailabilityToSlots(availability, timeSlots);
  }, [student, studentId, date, timeSlots, availabilityMode]);
  
  return {
    teacherAvailability,
    studentAvailability
  };
}
