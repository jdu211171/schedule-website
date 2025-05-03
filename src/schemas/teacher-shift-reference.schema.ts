import { z } from "zod";
import { dayOfWeekEnum } from "./teacher-preferences.schema";
import { TeacherSchema } from "./teacher.schema";

export const TeacherShiftReferenceSchema = z
  .object({
    shiftId: z.string(), // default: cuid()
    teacherId: z.string(),
    dayOfWeek: dayOfWeekEnum,
    startTime: z.date(),
    endTime: z.date(),
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
  })
  .strict();

export type TeacherShiftReference = z.infer<typeof TeacherShiftReferenceSchema>;
export const TeacherShiftReferenceSchemaArray = z.array(
  TeacherShiftReferenceSchema
);
