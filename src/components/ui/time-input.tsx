// components/ui/time-input.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = '00:00'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value into hours and minutes
  const parseValue = (val: string) => {
    if (val && /^\d{2}:\d{2}$/.test(val)) {
      const [h, m] = val.split(':');
      return { hours: h, minutes: m };
    }
    return { hours: '00', minutes: '00' };
  };

  const { hours, minutes } = parseValue(value);

  // Close dropdown when clicking outside
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

  // Update time value and call onChange
  const updateTime = (newHours: string, newMinutes: string) => {
    const formattedHours = newHours.padStart(2, '0');
    const formattedMinutes = newMinutes.padStart(2, '0');
    onChange(`${formattedHours}:${formattedMinutes}`);
  };

  // Adjust hours by delta
  const adjustHours = (delta: number) => {
    const currentHours = parseInt(hours, 10);
    let newHours = currentHours + delta;
    
    if (newHours < 0) newHours = 23;
    if (newHours > 23) newHours = 0;
    
    updateTime(newHours.toString(), minutes);
  };

  // Adjust minutes by delta (15-minute steps)
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Main Display - Click to Open Only */}
      <div
        className={cn(
          "flex items-center w-full border rounded-md px-3 py-2 bg-background text-foreground transition-colors cursor-pointer",
          "hover:border-accent focus:border-primary",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-primary ring-1 ring-primary",
          "border-input"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
        
        {/* Display Only - No Input */}
        <div className="flex items-center flex-1">
          <span className="text-center font-mono">{hours}</span>
          <span className="text-muted-foreground mx-1">:</span>
          <span className="text-center font-mono">{minutes}</span>
        </div>
      </div>

      {/* Dropdown Panel with Manual Controls */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg z-50">
          <div className="p-3">
            <div className="flex items-center justify-center space-x-4">
              {/* Hours Control */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded transition-colors"
                  onClick={() => adjustHours(1)}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className="text-lg font-mono w-8 text-center py-2">{hours}</span>
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
              
              {/* Minutes Control */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded transition-colors"
                  onClick={() => adjustMinutes(15)}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className="text-lg font-mono w-8 text-center py-2">{minutes}</span>
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
          </div>
        </div>
      )}
    </div>
  );
};