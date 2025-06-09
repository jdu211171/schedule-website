import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
}

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  teacherAvailability?: boolean[];
  studentAvailability?: boolean[];
  timeSlots?: TimeSlot[];
}

const AVAILABILITY_COLORS = {
  teacher: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    numberText: 'text-blue-600 dark:text-blue-400'
  },
  student: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-300',
    numberText: 'text-yellow-600 dark:text-yellow-400'
  },
  both: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    numberText: 'text-green-600 dark:text-green-400'
  },
  none: {
    bg: 'bg-background',
    border: 'border-input',
    text: 'text-foreground',
    numberText: 'text-foreground'
  }
};

const DEFAULT_TIME_SLOTS: TimeSlot[] = Array.from({ length: 57 }, (_, i) => {
  const hours = Math.floor(i / 4) + 8;
  const startMinutes = (i % 4) * 15;
  let endHours, endMinutes;

  if (startMinutes === 45) {
    endHours = hours + 1;
    endMinutes = 0;
  } else {
    endHours = hours;
    endMinutes = startMinutes + 15;
  }

  return {
    index: i,
    start: `${hours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
    end: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
    display: `${hours}:${startMinutes === 0 ? '00' : startMinutes} - ${endHours}:${endMinutes === 0 ? '00' : endMinutes}`,
    shortDisplay: i % 4 === 0 ? `${hours}:00` : ''
  };
});

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = '00:00',
  teacherAvailability,
  studentAvailability,
  timeSlots = DEFAULT_TIME_SLOTS
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseValue = (val: string) => {
    if (val && /^\d{2}:\d{2}$/.test(val)) {
      const [h, m] = val.split(':');
      return { hours: h, minutes: m };
    }
    return { hours: '00', minutes: '00' };
  };

  const { hours, minutes } = parseValue(value);

  const availabilityType = useMemo(() => {
    if (!teacherAvailability || !studentAvailability || !timeSlots) {
      return 'none';
    }

    const currentTime = `${hours}:${minutes}`;
    const slotIndex = timeSlots.findIndex(slot => slot.start === currentTime);
    
    if (slotIndex === -1) return 'none';

    const hasTeacher = teacherAvailability[slotIndex] || false;
    const hasStudent = studentAvailability[slotIndex] || false;

    if (hasTeacher && hasStudent) return 'both';
    if (hasTeacher) return 'teacher';
    if (hasStudent) return 'student';
    return 'none';
  }, [hours, minutes, teacherAvailability, studentAvailability, timeSlots]);

  const colors = AVAILABILITY_COLORS[availabilityType];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const updateTime = (newHours: string, newMinutes: string) => {
    const formattedHours = newHours.padStart(2, '0');
    const formattedMinutes = newMinutes.padStart(2, '0');
    onChange(`${formattedHours}:${formattedMinutes}`);
  };

  const adjustHours = (delta: number) => {
    const currentHours = parseInt(hours, 10);
    let newHours = currentHours + delta;
    
    if (newHours < 0) newHours = 23;
    if (newHours > 23) newHours = 0;
    
    updateTime(newHours.toString(), minutes);
  };

  const adjustMinutes = (delta: number) => {
    const currentMinutes = parseInt(minutes, 10);
    const currentHours = parseInt(hours, 10);
    
    let newMinutes = currentMinutes + delta;
    let newHours = currentHours;
    
    if (newMinutes < 0) {
      newMinutes = 45;
      newHours = currentHours - 1;
      if (newHours < 0) newHours = 23;
    } else if (newMinutes >= 60) {
      newMinutes = 0;
      newHours = currentHours + 1;
      if (newHours > 23) newHours = 0;
    }
    
    updateTime(newHours.toString(), newMinutes.toString());
  };

  const getTimeAvailability = (targetHours: string, targetMinutes: string) => {
    if (!teacherAvailability || !studentAvailability || !timeSlots) {
      return 'none';
    }

    const targetTime = `${targetHours.padStart(2, '0')}:${targetMinutes.padStart(2, '0')}`;
    const slotIndex = timeSlots.findIndex(slot => slot.start === targetTime);
    
    if (slotIndex === -1) return 'none';

    const hasTeacher = teacherAvailability[slotIndex] || false;
    const hasStudent = studentAvailability[slotIndex] || false;

    if (hasTeacher && hasStudent) return 'both';
    if (hasTeacher) return 'teacher';
    if (hasStudent) return 'student';
    return 'none';
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center w-full border rounded-md px-3 py-2 transition-colors cursor-pointer",
          "hover:border-accent focus:border-primary",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-primary ring-1 ring-primary",
          colors.bg,
          colors.border,
          colors.text
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
        
        <div className="flex items-center flex-1">
          <span className={`text-center font-mono font-bold text-lg ${colors.numberText}`}>{hours}</span>
          <span className="text-muted-foreground mx-1">:</span>
          <span className={`text-center font-mono font-bold text-lg ${colors.numberText}`}>{minutes}</span>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg z-50">
          <div className="p-3">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded transition-colors"
                  onClick={() => adjustHours(1)}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className={`text-lg font-mono w-8 text-center py-2 font-bold ${colors.numberText}`}>{hours}</span>
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded transition-colors"
                  onClick={() => adjustHours(-1)}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground mt-1">時</span>
              </div>
              
              <span className="text-xl font-mono text-muted-foreground">:</span>
              
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded transition-colors"
                  onClick={() => adjustMinutes(15)}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className={`text-lg font-mono w-8 text-center py-2 font-bold ${colors.numberText}`}>{minutes}</span>
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded transition-colors"
                  onClick={() => adjustMinutes(-15)}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground mt-1">分</span>
              </div>
            </div>

            {(teacherAvailability || studentAvailability) && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-xs text-center">
                  {availabilityType === 'both' && (
                    <span className="text-green-600 dark:text-green-400">✓ 両方利用可能</span>
                  )}
                  {availabilityType === 'teacher' && (
                    <span className="text-blue-600 dark:text-blue-400">講師のみ利用可能</span>
                  )}
                  {availabilityType === 'student' && (
                    <span className="text-yellow-600 dark:text-yellow-400">生徒のみ利用可能</span>
                  )}
                  {availabilityType === 'none' && (
                    <span className="text-gray-500 dark:text-gray-400">誰も利用できません</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};