import { DisplayLesson, TemplateDataFromAPI } from "./types";

/**
 * Transforms data from REST API into DisplayLesson format
 * @param template Lesson template data from API
 * @param teacherName Teacher's name
 * @param studentName Student's name
 * @param lessonType Lesson type (teacher, student, current)
 * @returns DisplayLesson object
 */

export function transformTemplateToDisplayLesson(
  template: TemplateDataFromAPI, 
  teacherName: string, 
  studentName: string,
  lessonType?: 'teacher' | 'student' | 'current'
): DisplayLesson {
  const id = template.templateId || template.id || `temp-${Math.random().toString(36).substring(2, 9)}`;
  
  let subjectName = "Unknown Subject";
  if (template.subject && typeof template.subject === 'object' && template.subject.name) {
    subjectName = template.subject.name;
  } else if (template.subjectName) {
    subjectName = template.subjectName;
  }
  
  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return "";
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
  
  const studentId = Array.isArray(template.studentIds) && template.studentIds.length > 0
    ? template.studentIds[0] 
    : (template.studentId || "");
  
  const room = template.booth && template.booth.name ? template.booth.name : (template.room || "");
  
  // Стандартизация представления dayOfWeek
  let dayOfWeek = template.dayOfWeek !== undefined ? String(template.dayOfWeek) : "1";
  
  const dayOfWeekMap: Record<string, string> = {
    "0": "SUNDAY",
    "1": "MONDAY",
    "2": "TUESDAY",
    "3": "WEDNESDAY",
    "4": "THURSDAY",
    "5": "FRIDAY",
    "6": "SATURDAY"
  };
  
  if (dayOfWeekMap[dayOfWeek]) {
    dayOfWeek = dayOfWeekMap[dayOfWeek];
  }
  
  const result: DisplayLesson = {
    id,
    name: subjectName,
    dayOfWeek,
    startTime: formatTime(template.startTime) || "00:00",
    endTime: formatTime(template.endTime) || "00:00",
    teacherId: template.teacherId || "",
    studentId: studentId || "",
    status: template.status || 'active',
    templateId: template.templateId,
    subjectId: template.subjectId,
    subjectName,
    teacherName,
    studentName,
    room,
    boothId: template.boothId,
    lessonType
  };
  
  return result;
}