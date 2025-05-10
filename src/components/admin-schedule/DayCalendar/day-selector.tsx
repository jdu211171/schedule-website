import React, { useMemo } from 'react';

type DaySelectorProps = {
  selectedDays: Date[];
  onSelectDay: (date: Date, isSelected: boolean) => void;
};

const isSameDayDate = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onSelectDay }) => {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  }, []);
  
  const currentDayOfWeek = today.getDay();
  
  const upcomingDates = useMemo(() => {
    const dates: Date[] = [];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const date = new Date(today);
      
      if (dayOfWeek === currentDayOfWeek) {
        dates.push(date);
        continue;
      }
      
      let daysToAdd;
      if (dayOfWeek > currentDayOfWeek) {
        daysToAdd = dayOfWeek - currentDayOfWeek;
      } else {
        daysToAdd = 7 - (currentDayOfWeek - dayOfWeek);
      }
      
      date.setDate(today.getDate() + daysToAdd);
      date.setHours(12, 0, 0, 0);
      dates.push(date);
    }
    
    return dates;
  }, [today, currentDayOfWeek]);
  
  const daysOfWeek = [
    { label: '月', value: 1, index: 1 },
    { label: '火', value: 2, index: 2 },
    { label: '水', value: 3, index: 3 },
    { label: '木', value: 4, index: 4 },
    { label: '金', value: 5, index: 5 },
    { label: '土', value: 6, index: 6 },
    { label: '日', value: 0, index: 0 }
  ];
  
  const isDaySelected = (dayValue: number) => {
    const targetDate = upcomingDates[dayValue];
    return selectedDays.some(date => isSameDayDate(date, targetDate));
  };
  
  return (
    <div className="flex space-x-2 items-center">
      <span className="text-sm font-medium">表示する日:</span>
      
      {daysOfWeek.map(day => {
        const isToday = day.value === currentDayOfWeek;
        const isSelected = isDaySelected(day.value);
        const targetDate = upcomingDates[day.value];
        
        return (
          <label 
            key={day.value}
            className={`
              inline-flex items-center justify-center w-8 h-8 rounded-full border 
              ${isSelected ? 'bg-primary text-white' : isToday ? 'bg-gray-200' : 'bg-background'} 
              ${isToday ? 'font-bold' : ''}
              cursor-pointer hover:bg-primary/10
            `}
            title={`${getDateKey(targetDate)}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isSelected}
              onChange={(e) => {
                onSelectDay(targetDate, e.target.checked);
              }}
            />
            {day.label}
          </label>
        );
      })}
    </div>
  );
};