import { DisplayLesson, TemplateDataFromAPI } from "./types";

/**
 * Transforms data from REST API into DisplayLesson format
 * @param template Lesson template data from API
 * @param teacherName Teacher's name
 * @param studentName Student's name
 * @param lessonType Lesson type (teacher, student, current)
 * @returns DisplayLesson object
 */
export const transformTemplateToDisplayLesson = (
  template: TemplateDataFromAPI, 
  teacherName: string, 
  studentName: string,
  lessonType?: 'teacher' | 'student' | 'current'
): DisplayLesson => {
  const id = template.templateId || template.id || `temp-${Date.now()}`;
  
  let subjectName = "Unknown Subject";
  if (template.subject && 'name' in template.subject && template.subject.name) {
    subjectName = template.subject.name;
  } else if (template.subjectName) {
    subjectName = template.subjectName;
  }
  
  // Обработка типа класса
  const classTypeId = template.classTypeId || "";
  let classTypeName = "";
  
  // Если есть объект classType, получаем из него имя
  if (template.classType && typeof template.classType === 'object' && template.classType !== null && 'name' in template.classType) {
    classTypeName = template.classType.name || "";
  }
  
  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return "00:00";
    if (timeStr.includes("T")) {
      try {
        const date = new Date(timeStr);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
        console.error("Error formatting time:", e);
        return timeStr;
      }
    }
    return timeStr;
  };
  
  const studentId = template.studentIds?.[0] || template.studentId || "";
  
  let dayOfWeekStr = "MONDAY"; 
  if (template.dayOfWeek !== undefined) {
    const dayOfWeekMap: Record<string, string> = {
      "0": "SUNDAY",
      "1": "MONDAY",
      "2": "TUESDAY",
      "3": "WEDNESDAY",
      "4": "THURSDAY",
      "5": "FRIDAY",
      "6": "SATURDAY"
    };
    
    const dayVal = String(template.dayOfWeek);
    if (dayOfWeekMap[dayVal]) {
      dayOfWeekStr = dayOfWeekMap[dayVal];
    } else {
      dayOfWeekStr = dayVal;
    }
  }
  
  return {
    id,
    templateId: template.templateId,
    name: subjectName,
    dayOfWeek: dayOfWeekStr,
    startTime: formatTime(template.startTime),
    endTime: formatTime(template.endTime),
    status: template.status || 'active',
    teacherId: template.teacherId || "",
    studentId,
    subjectId: template.subjectId,
    subjectName,
    teacherName: teacherName,
    studentName: studentName,
    room: template.booth?.name || "",
    boothId: template.boothId,
    classTypeId,
    classTypeName,
    startDate: template.startDate || undefined,
    endDate: template.endDate || undefined,
    lessonType: lessonType 
  };
};