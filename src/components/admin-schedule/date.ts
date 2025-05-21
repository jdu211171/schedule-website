/**
 * Formats a UTC time string or Date object to Japan time (JST)
 * @param isoTime ISO time string or Date object
 * @returns Formatted time string in HH:MM format
 */
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
  
  /**
   * Converts a Japan time string to UTC Date
   * @param japanTime Time string in Japan time zone (HH:MM)
   * @returns Date object in UTC
   */
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
  
  /**
   * Checks if a time in Japan format is within the display range (8:00-22:00)
   * @param japanTime Time string in Japan time zone (HH:MM)
   * @returns Boolean indicating whether time is in display range
   */
  export function isTimeInDisplayRange(japanTime: string): boolean {
    const [hours, minutes] = japanTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    const minMinutes = 8 * 60;
    const maxMinutes = 22 * 60;
    
    return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
  }
  
  /**
   * Calculates a time slot index (0-56) for a given Japan time
   * Assumes time slots start at 8:00 and increment by 15 minutes
   * @param japanTime Time string in Japan time zone (HH:MM)
   * @returns Index of the time slot
   */
  export function calculateTimeSlotIndex(japanTime: string): number {
    const [hours, minutes] = japanTime.split(':').map(Number);
    
    const hoursOffset = hours - 8;
    const minutesOffset = Math.floor(minutes / 15);
    
    return hoursOffset * 4 + minutesOffset;
  }
  
  /**
   * Returns current date adjusted to noon (for consistent day comparison)
   * @returns Date object set to current date at 12:00
   */
  export function getCurrentDateAdjusted(): Date {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }
  
  /**
   * Compares two dates to check if they are the same day
   * @param date1 First date to compare
   * @param date2 Second date to compare
   * @returns Boolean indicating whether dates are the same day
   */
  export function isSameDayDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }
  
  /**
   * Gets a date string in YYYY-MM-DD format
   * @param date Date object
   * @returns Date string in YYYY-MM-DD format
   */
  export function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Gets a date key for lookups and comparisons (YYYY-MM-DD)
   * @param date Date object
   * @returns Date key string
   */
  export function getDateKey(date: Date): string {
    return date.toISOString().substring(0, 10);
  }
  
  /**
   * Checks if a day exists in an array of dates
   * @param day Date to find
   * @param array Array of dates to search
   * @returns Boolean indicating whether day is in array
   */
  export function isDayInArray(day: Date, array: Date[]): boolean {
    return array.some(d =>
      d.getDate() === day.getDate() &&
      d.getMonth() === day.getMonth() &&
      d.getFullYear() === day.getFullYear()
    );
  }
  
  /**
   * Checks if two dates or date strings represent the same day
   * @param date1 First date/string to compare
   * @param date2 Second date/string to compare
   * @returns Boolean indicating whether dates are the same day
   */
  export function isSameDay(date1: string | Date, date2: string | Date): boolean {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }