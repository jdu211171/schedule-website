import { z } from "zod";

export const StudentPreferenceTeacherSchema = z
  .object({
    preferenceTeacherId: z.string({
      required_error: "優先講師IDは必須です",
      invalid_type_error: "優先講師IDは文字列である必要があります",
    }), // default: cuid()
    preferenceId: z.string({
      required_error: "優先設定IDは必須です",
      invalid_type_error: "優先設定IDは文字列である必要があります",
    }),
    teacherId: z.string({
      required_error: "講師IDは必須です",
      invalid_type_error: "講師IDは文字列である必要があります",
    }),
    // preference: z.lazy(() => StudentPreferenceSchema), // relation: StudentPreference
    // teacher: z.lazy(() => TeacherSchema), // relation: Teacher
  })
  .strict({ message: "予期しないフィールドが含まれています" });
