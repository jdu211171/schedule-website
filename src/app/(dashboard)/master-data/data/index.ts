import { studentTypesTable } from "./student-types";
import { subjectTypesTable } from "./subject-types";
import { gradesTable } from "./grades";
import { lessonTypesTable } from "./lesson-types";
import { evaluationsTable } from "./evaluations";
import { timeSlotsTable } from "./time-slots";
import { boothsTable } from "./booths";
import { subjectsTable } from "./subjects";
import { coursesTable } from "./courses";

export const tableData: Record<
  string,
  { columns: any[]; data: any[] } // Позже уточним тип
> = {
  studentTypes: studentTypesTable,
  subjectTypes: subjectTypesTable,
  grades: gradesTable,
  lessonTypes: lessonTypesTable,
  evaluations: evaluationsTable,
  timeSlots: timeSlotsTable,
  booths: boothsTable,
  subjects: subjectsTable,
  courses: coursesTable,
};
