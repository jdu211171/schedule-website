import { z } from "zod";

export const TeacherShiftReferenceSchema = z
  .object({
    shiftId: z.string(), // default: cuid()
    teacherId: z.string(),
    dayOfWeek: DayOfWeekEnum,
    startTime: z.date(),
    endTime: z.date(),
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
  })
  .strict();
