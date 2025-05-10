export function formatToJapanTime(isoTime: string | Date | undefined): string {
    if (!isoTime) return '';
    
    try {
      if (typeof isoTime === 'string' && isoTime.startsWith('1970-01-01T')) {
        const timePart = isoTime.split('T')[1];
        const [hours, minutes] = timePart.split(':').map(Number);
        
        let japanHours = hours + 9;
        if (japanHours >= 24) japanHours -= 24;
        
        return `${japanHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      } 
      else {
        const date = isoTime instanceof Date ? isoTime : new Date(isoTime);
        const formatter = new Intl.DateTimeFormat('ja-JP', {
          timeZone: 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        return formatter.format(date).replace(/[^0-9:]/g, '');
      }
    } catch {
      return '';
    }
  }
  
  export function convertJapanTimeToUTC(japanTime: string): Date {
    try {
      const [hours, minutes] = japanTime.split(':').map(Number);
      
      let utcHours = hours - 9;
      if (utcHours < 0) utcHours += 24;
      
      return new Date(Date.UTC(1970, 0, 1, utcHours, minutes, 0));
    } catch {
      return new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
    }
  }
  
  export function isTimeInDisplayRange(japanTime: string): boolean {
    const [hours, minutes] = japanTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    const minMinutes = 8 * 60;
    const maxMinutes = 22 * 60;
    
    return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
  }
  
  export function calculateTimeSlotIndex(japanTime: string): number {
    const [hours, minutes] = japanTime.split(':').map(Number);
    
    const hoursOffset = hours - 8;
    const minutesOffset = Math.floor(minutes / 15);
    
    return hoursOffset * 4 + minutesOffset;
  }
  
  export function getCurrentDateAdjusted(): Date {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }
  
  export function isSameDayDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }
  
  export function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }