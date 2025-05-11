import { z } from "zod";
import { TeacherSchema } from "./teacher.schema";

export const TeacherShiftReferenceSchema = z
  .object({
    shiftId: z.string({
      required_error: "シフトIDは必須です",
      invalid_type_error: "シフトIDは文字列である必要があります",
    }), // default: cuid()
    teacherId: z.string({
      required_error: "講師IDは必須です",
      invalid_type_error: "講師IDは文字列である必要があります",
    }),
    // dayOfWeek: dayOfWeekEnum, // TODO: Add Japanese error messages if this enum is defined with Zod
    startTime: z.date({
      required_error: "開始日時は必須です",
      invalid_type_error: "開始日時は有効な日付である必要があります",
    }),
    endTime: z.date({
      required_error: "終了日時は必須です",
      invalid_type_error: "終了日時は有効な日付である必要があります",
    }),
    teacher: z.lazy(() => TeacherSchema), // relation: Teacher
  })
  .strict({ message: "予期しないフィールドが含まれています" });

export type TeacherShiftReference = z.infer<typeof TeacherShiftReferenceSchema>;
export const TeacherShiftReferenceSchemaArray = z.array(
  TeacherShiftReferenceSchema
);
