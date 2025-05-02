// components/match/lesson-modal-api-utils.ts

// Отображение дней недели с локализацией на японский
export const dayMapping: Record<string, string> = {
    'MONDAY': '月曜日',
    'TUESDAY': '火曜日',
    'WEDNESDAY': '水曜日',
    'THURSDAY': '木曜日',
    'FRIDAY': '金曜日',
    'SATURDAY': '土曜日',
    'SUNDAY': '日曜日'
  };
  
  // Отображение дней недели с английскими названиями
  export const dayMappingEn: Record<string, string> = {
    'MONDAY': 'Monday',
    'TUESDAY': 'Tuesday',
    'WEDNESDAY': 'Wednesday',
    'THURSDAY': 'Thursday',
    'FRIDAY': 'Friday',
    'SATURDAY': 'Saturday',
    'SUNDAY': 'Sunday'
  };
  
  // Сопоставление между числовыми и строковыми представлениями дней недели
  export const dayNumberToString: Record<number, string> = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY'
  };
  
  export const dayStringToNumber: Record<string, number> = {
    'SUNDAY': 0,
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6
  };
  
  // Получение номера дня недели из строкового представления
  export function getDayOfWeekNumber(day: string): number {
    return dayStringToNumber[day] || -1;
  }
  
  // Получение строкового представления дня недели из номера
  export function getDayOfWeekString(dayNumber: number | string): string {
    const dayNum = typeof dayNumber === 'string' ? parseInt(dayNumber) : dayNumber;
    return dayNumberToString[dayNum] || '';
  }
  
  // Получение локализованного названия дня недели
  export function getLocalizedDayName(dayString: string): string {
    return dayMapping[dayString] || dayString;
  }
  
  // Функция для расчета времени окончания занятия
  export function calculateEndTime(startTime: string, duration: string): string {
    if (!startTime) return '';
    
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      let durationMinutes = 90;
      
      if (duration === '60分') durationMinutes = 60;
      else if (duration === '120分') durationMinutes = 120;
      
      const endMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error('Ошибка расчета времени окончания:', e);
      return '';
    }
  }
  
  // Преобразование времени в минуты
  export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Преобразование минут во время
  export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  // Форматирование времени из ISO строки в HH:MM
  export function formatTimeString(timeString: string): string {
    // Если время в формате ISO строки (например, "1970-01-01T14:00:00.000Z")
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Если время уже в формате HH:MM
    return timeString;
  }
  
  // Округление времени до ближайших 15 минут
  export function roundToNearest15Minutes(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    
    const newHours = Math.floor(roundedMinutes / 60) % 24;
    const newMinutes = roundedMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }
  
  // Проверка валидности формата времени
  export function isValidTimeFormat(timeString: string): boolean {
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timePattern.test(timeString);
  }
  
  // Проверка, что время кратно 15 минутам
  export function isValid15MinuteStep(timeString: string): boolean {
    if (!isValidTimeFormat(timeString)) return false;
    
    const [, minutes] = timeString.split(':').map(Number);
    return minutes % 15 === 0;
  }
  
  // Определение цвета для дня недели (для визуального отображения)
  export function getLessonColor(dayOfWeek: number | string): string {
    const day = typeof dayOfWeek === 'string' ? parseInt(dayOfWeek) : dayOfWeek;
    
    const colors = [
      'bg-red-100 border-red-200',       // Воскресенье
      'bg-blue-100 border-blue-200',     // Понедельник
      'bg-orange-100 border-orange-200', // Вторник
      'bg-green-100 border-green-200',   // Среда
      'bg-yellow-100 border-yellow-200', // Четверг
      'bg-purple-100 border-purple-200', // Пятница
      'bg-pink-100 border-pink-200'      // Суббота
    ];
    
    return colors[day] || 'bg-gray-100 border-gray-200';
  }