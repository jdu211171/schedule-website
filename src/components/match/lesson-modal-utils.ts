// Утилиты для работы с модальным окном урока
import { 
    teacherAvailability, 
    studentAvailability, 
    mockSubjects, 
    mockTeacherSubjects, 
    studentPreferences 
  } from './mock-data';
  
  // Преобразователи названий дней недели
  export const dayMapping = {
    monday: "月曜日",
    tuesday: "火曜日",
    wednesday: "水曜日",
    thursday: "木曜日",
    friday: "金曜日",
    saturday: "土曜日",
    sunday: "日曜日"
  };
  
  export const dayMappingReverse: { [key: string]: string } = {
    "月曜日": "monday",
    "火曜日": "tuesday",
    "水曜日": "wednesday",
    "木曜日": "thursday",
    "金曜日": "friday",
    "土曜日": "saturday",
    "日曜日": "sunday"
  };
  
  // Получение списка доступных предметов для выбранных учителя и ученика
  export function getAvailableSubjects(teacherId: string, studentId: string) {
    const { commonSubjects, hasCommonSubjects } = findCommonSubjects(teacherId, studentId);
    
    return {
      subjects: commonSubjects,
      hasSubjects: hasCommonSubjects
    };
  }
  
  // Получение списка доступных дней недели для выбранных учителя и ученика
  export function getAvailableDays(teacherId: string, studentId: string) {
    const { intersections, hasIntersections } = findAvailabilityIntersection(teacherId, studentId);
    
    const availableDays = Object.keys(intersections).map(day => ({
      value: day,
      label: dayMapping[day as keyof typeof dayMapping] || day
    }));
    
    return {
      days: availableDays,
      hasDays: hasIntersections
    };
  }
  
  // Получение доступных временных слотов для выбранных учителя, ученика и дня недели
  export function getAvailableTimeSlots(
    teacherId: string, 
    studentId: string, 
    day: string
  ) {
    const { intersections } = findAvailabilityIntersection(teacherId, studentId);
    
    if (!intersections[day]) {
      return {
        timeSlots: [],
        hasTimeSlots: false,
        earliestAvailableTime: ''
      };
    }
    
    const timeOptions: { start: string, end: string }[] = [];
    
    intersections[day].forEach(slot => {
      const startMinutes = timeToMinutes(slot.start);
      const endMinutes = timeToMinutes(slot.end);
      
      if (endMinutes - startMinutes >= 60) {
        for (let time = startMinutes; time <= endMinutes - 60; time += 15) {
          timeOptions.push({
            start: minutesToTime(time),
            end: minutesToTime(time + 60)
          });
        }
      }
    });
    
    timeOptions.sort((a, b) => {
      return a.start.localeCompare(b.start);
    });
    
    const earliestTimeSlot = timeOptions.length > 0 ? timeOptions[0].start : '';
    
    return {
      timeSlots: timeOptions,
      hasTimeSlots: timeOptions.length > 0,
      earliestAvailableTime: earliestTimeSlot
    };
  }
  
  // Получение списка стандартных продолжительностей урока
  export function getLessonDurations(startTime: string, endTime: string) {
    if (!startTime || !endTime) {
      return [
        { value: "60分", isAvailable: true },
        { value: "90分", isAvailable: true },
        { value: "120分", isAvailable: true }
      ];
    }
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    
    return [
      { value: "60分", isAvailable: duration >= 60 },
      { value: "90分", isAvailable: duration >= 90 },
      { value: "120分", isAvailable: duration >= 120 }
    ];
  }
  
  // Проверка доступности временного слота для заданной продолжительности
  export function isTimeSlotAvailableForDuration(
    teacherId: string, 
    studentId: string, 
    day: string, 
    startTime: string, 
    duration: number
  ) {
    const { intersections } = findAvailabilityIntersection(teacherId, studentId);
    
    if (!intersections[day]) {
      return false;
    }
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + duration;
    
    return intersections[day].some(slot => {
      const slotStartMinutes = timeToMinutes(slot.start);
      const slotEndMinutes = timeToMinutes(slot.end);
      
      return slotStartMinutes <= startMinutes && slotEndMinutes >= endMinutes;
    });
  }
  
  // Рассчитать время окончания урока на основе времени начала и продолжительности
  export function calculateEndTime(startTime: string, duration: string): string {
    if (!startTime) return "";
    
    try {
      const [hours, minutes] = startTime.split(":").map(Number);
      let durationMinutes = 90;
      
      if (duration === "60分") durationMinutes = 60;
      else if (duration === "120分") durationMinutes = 120;
      
      const endMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      
      return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
    } catch (e) {
      console.error("Ошибка расчета времени окончания:", e);
      return "";
    }
  }
  
  // Конвертеры для дней недели
  export function getDayOfWeekNumber(day: string): number {
    const dayMap: { [key: string]: number } = {
      "sunday": 0,
      "monday": 1,
      "tuesday": 2,
      "wednesday": 3,
      "thursday": 4, 
      "friday": 5,
      "saturday": 6
    };
    return dayMap[day] || 0;
  }
  
  export function getDayOfWeekString(dayNumber: number): string {
    const dayMapReverse: { [key: number]: string } = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday", 
      5: "friday",
      6: "saturday"
    };
    return dayMapReverse[dayNumber] || "";
  }
  
  // Конвертер названий предметов в японский
  export function getSubjectNameJapanese(subject: string): string {
    const subjectMap: { [key: string]: string } = {
      "physics": "物理",
      "chemistry": "化学",
      "math": "数学",
      "subject1": "数学",
      "subject2": "英語",
      "subject3": "物理",
      "subject4": "化学"
    };
    return subjectMap[subject] || subject;
  }
  
  // Функция для поиска пересечений в доступности
  export function findAvailabilityIntersection(teacherId: string, studentId: string) {
    const teacher = teacherAvailability[teacherId as keyof typeof teacherAvailability];
    const student = studentAvailability[studentId as keyof typeof studentAvailability];
    
    if (!teacher || !student) {
      return { intersections: {}, hasIntersections: false };
    }
    
    const intersections: Record<string, { start: string, end: string }[]> = {};
    let hasIntersections = false;
  
    Object.keys(teacher).forEach(day => {
      if (student[day as keyof typeof student]) {
        const teacherSlots = teacher[day as keyof typeof teacher] as { start: string, end: string }[];
        const studentSlots = student[day as keyof typeof student] as { start: string, end: string }[];
        
        const dayIntersections = [];
        
        for (const teacherSlot of teacherSlots) {
          for (const studentSlot of studentSlots) {
            const startIntersection = timeToMinutes(
              timeToMinutes(teacherSlot.start) > timeToMinutes(studentSlot.start) 
                ? teacherSlot.start 
                : studentSlot.start
            );
            
            const endIntersection = timeToMinutes(
              timeToMinutes(teacherSlot.end) < timeToMinutes(studentSlot.end) 
                ? teacherSlot.end 
                : studentSlot.end
            );
            
            if (startIntersection < endIntersection) {
              dayIntersections.push({
                start: minutesToTime(startIntersection),
                end: minutesToTime(endIntersection)
              });
              hasIntersections = true;
            }
          }
        }
        
        if (dayIntersections.length > 0) {
          intersections[day] = dayIntersections;
        }
      }
    });
    
    return { intersections, hasIntersections };
  }
  
  // Функция для поиска общих предметов
  export function findCommonSubjects(teacherId: string, studentId: string) {
    const teacherSubjectsData = mockTeacherSubjects.filter(ts => ts.teacherId === teacherId);
    const teacherSubjectIds = teacherSubjectsData.map(ts => ts.subjectId);
    
    const studentPreference = studentPreferences[studentId as keyof typeof studentPreferences];
    if (!studentPreference) {
      return { commonSubjects: [], hasCommonSubjects: false };
    }
    
    const studentSubjectIds = studentPreference.preferredSubjects;
    
    const commonSubjectIds = teacherSubjectIds.filter(id => 
      studentSubjectIds.includes(id)
    );
    
    const commonSubjects = mockSubjects.filter(subject => 
      commonSubjectIds.includes(subject.subjectId)
    );
    
    return { 
      commonSubjects, 
      hasCommonSubjects: commonSubjects.length > 0 
    };
  }
  
  // Вспомогательные функции для работы со временем
  export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }