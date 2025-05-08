import React from 'react';

type DaySelectorProps = {
  selectedDays: Date[];
  onSelectDay: (date: Date, isSelected: boolean) => void;
};

export const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onSelectDay }) => {
  const daysOfWeek = [
    { label: '月', value: 1 },
    { label: '火', value: 2 }, 
    { label: '水', value: 3 }, 
    { label: '木', value: 4 }, 
    { label: '金', value: 5 }, 
    { label: '土', value: 6 }, 
    { label: '日', value: 0 }  
  ];
  
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  
  // Проверяет, выбран ли день
  const isDaySelected = (dayValue: number) => {
    return selectedDays.some(date => date.getDay() === dayValue);
  };
  
  // Получает дату для определенного дня недели (ближайший к текущей дате)
  const getDateForDay = (dayValue: number) => {
    const date = new Date(today);
    const diff = (dayValue - currentDayOfWeek + 7) % 7;
    date.setDate(today.getDate() + diff);
    return date;
  };
  
  return (
    <div className="flex space-x-2 items-center">
      <span className="text-sm font-medium">表示する日:</span>
      {daysOfWeek.map(day => {
        const isToday = day.value === currentDayOfWeek;
        const isSelected = isDaySelected(day.value);
        
        return (
          <label 
            key={day.value}
            className={`
              inline-flex items-center justify-center w-8 h-8 rounded-full border 
              ${isSelected ? 'bg-primary text-white' : isToday ? 'bg-gray-200' : 'bg-background'} 
              ${isToday ? 'font-bold' : ''}
              cursor-pointer hover:bg-primary/10
            `}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isSelected}
              onChange={(e) => {
                const date = getDateForDay(day.value);
                onSelectDay(date, e.target.checked);
              }}
            />
            {day.label}
          </label>
        );
      })}
    </div>
  );
};