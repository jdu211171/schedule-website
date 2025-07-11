import { TimeSlot } from '@/components/admin-schedule/DayCalendar/day-calendar';

export interface Booth {
  boothId: string;
  name?: string;
}

export interface LessonTime {
  startTime: string | Date | undefined | null;
  endTime: string | Date | undefined | null;
}

export interface LessonPosition {
  startSlotIndex: number;
  endSlotIndex: number;
  boothIndex: number;
  duration: number;
  isValid: boolean;
}

/**
 * Extract time string from various time formats
 */
export const extractTime = (timeValue: string | Date | undefined | null): string => {
  if (!timeValue) return '';
  
  try {
    if (typeof timeValue === 'string') {
      // Already in HH:MM format
      if (/^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      
      // Extract from ISO string
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

/**
 * Convert time string to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return -1;
  return hour * 60 + minute;
};

/**
 * Find the time slot index for a given time
 */
export const findTimeSlotIndex = (time: string, timeSlots: TimeSlot[]): number => {
  // Exact match
  const exactMatch = timeSlots.findIndex(slot => slot.start === time);
  if (exactMatch >= 0) return exactMatch;
  
  // Find the slot that contains this time
  const timeMinutes = timeToMinutes(time);
  if (timeMinutes < 0) return -1;
  
  return timeSlots.findIndex(slot => {
    const slotMinutes = timeToMinutes(slot.start);
    if (slotMinutes < 0) return false;
    
    // Assuming 15-minute slots
    return slotMinutes <= timeMinutes && timeMinutes < (slotMinutes + 15);
  });
};

/**
 * Find the booth index for a lesson
 */
export const findBoothIndex = (
  lesson: { boothId?: string | null; boothName?: string | null; booth?: { name?: string | null } | null },
  booths: Booth[]
): number => {
  // Try exact ID match first
  if (lesson.boothId) {
    const exactMatch = booths.findIndex(booth => booth.boothId === lesson.boothId);
    if (exactMatch >= 0) return exactMatch;
  }
  
  // Try name match
  const boothName = lesson.boothName || (lesson.booth && lesson.booth.name);
  if (boothName) {
    const nameMatch = booths.findIndex(booth => booth.name === boothName);
    if (nameMatch >= 0) return nameMatch;
  }
  
  return -1;
};

/**
 * Calculate lesson duration in time slots
 */
export const calculateDurationInSlots = (startTime: string, endTime: string, slotDurationMinutes: number = 15): number => {
  if (!startTime || !endTime) return 0;
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (startMinutes < 0 || endMinutes < 0 || endMinutes <= startMinutes) return 0;
  
  const durationMinutes = endMinutes - startMinutes;
  return Math.ceil(durationMinutes / slotDurationMinutes);
};

/**
 * Calculate complete lesson position information
 */
export const calculateLessonPosition = (
  lesson: LessonTime & { boothId?: string | null; boothName?: string | null; booth?: { name?: string | null } | null },
  timeSlots: TimeSlot[],
  booths: Booth[]
): LessonPosition => {
  const startTime = extractTime(lesson.startTime);
  const endTime = extractTime(lesson.endTime);
  
  const startSlotIndex = findTimeSlotIndex(startTime, timeSlots);
  const endSlotIndex = findTimeSlotIndex(endTime, timeSlots);
  const boothIndex = findBoothIndex(lesson, booths);
  
  const duration = calculateDurationInSlots(startTime, endTime);
  
  const isValid = startSlotIndex >= 0 && endSlotIndex >= startSlotIndex && boothIndex >= 0 && duration > 0;
  
  return {
    startSlotIndex,
    endSlotIndex: endSlotIndex >= 0 ? endSlotIndex : startSlotIndex + duration - 1,
    boothIndex,
    duration,
    isValid
  };
};

/**
 * Find closest valid time slot for a given time
 */
export const findClosestTimeSlot = (time: string, timeSlots: TimeSlot[]): number => {
  const targetMinutes = timeToMinutes(time);
  if (targetMinutes < 0) return 0;
  
  let closestIndex = 0;
  let minDiff = Infinity;
  
  timeSlots.forEach((slot, index) => {
    const slotMinutes = timeToMinutes(slot.start);
    if (slotMinutes < 0) return;
    
    const diff = Math.abs(targetMinutes - slotMinutes);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = index;
    }
  });
  
  return closestIndex;
};

/**
 * Calculate new lesson times after a drop operation
 */
export const calculateNewLessonTimes = (
  dropTimeIndex: number,
  lessonDurationSlots: number,
  timeSlots: TimeSlot[]
): { startTime: string; endTime: string } | null => {
  const startSlot = timeSlots[dropTimeIndex];
  if (!startSlot) return null;
  
  // Calculate end slot index
  const endSlotIndex = dropTimeIndex + lessonDurationSlots - 1;
  
  // Use last available slot if we exceed the range
  const endSlot = timeSlots[endSlotIndex] || timeSlots[timeSlots.length - 1];
  
  return {
    startTime: startSlot.start,
    endTime: endSlot.end
  };
};

/**
 * Check if two time ranges overlap
 */
export const checkTimeOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  if (start1Minutes < 0 || end1Minutes < 0 || start2Minutes < 0 || end2Minutes < 0) {
    return false;
  }
  
  // Check if ranges overlap
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
};

/**
 * Check if a lesson would overlap with existing lessons
 */
export const checkLessonOverlap = (
  lessonId: string,
  boothId: string,
  startTime: string,
  endTime: string,
  existingLessons: Array<{
    classId: string;
    boothId?: string | null;
    startTime: string | Date | undefined | null;
    endTime: string | Date | undefined | null;
  }>
): boolean => {
  return existingLessons.some(lesson => {
    // Skip the lesson being moved
    if (lesson.classId === lessonId) return false;
    
    // Only check lessons in the same booth
    if (lesson.boothId !== boothId) return false;
    
    const lessonStart = extractTime(lesson.startTime);
    const lessonEnd = extractTime(lesson.endTime);
    
    if (!lessonStart || !lessonEnd) return false;
    
    return checkTimeOverlap(startTime, endTime, lessonStart, lessonEnd);
  });
};