import { z } from "zod";

export const StudentClassEnrollmentSchema = z
  .object({
    enrollmentId: z.string({
      required_error: "登録IDは必須です",
      invalid_type_error: "登録IDは文字列である必要があります",
    }), // default: cuid()
    classId: z.string({
      required_error: "クラスIDは必須です",
      invalid_type_error: "クラスIDは文字列である必要があります",
    }),
    studentId: z.string({
      required_error: "生徒IDは必須です",
      invalid_type_error: "生徒IDは文字列である必要があります",
    }),
    // classSession: z.lazy(() => ClassSessionSchema), // relation: ClassSession
    // student: z.lazy(() => StudentSchema), // relation: Student
    createdAt: z.date({
      required_error: "作成日は必須です",
      invalid_type_error: "作成日は有効な日付である必要があります",
    }), // default: now()
    updatedAt: z.date({
      required_error: "更新日は必須です",
      invalid_type_error: "更新日は有効な日付である必要があります",
    }), // default: now()
  })
  .strict({ message: "予期しないフィールドが含まれています" });
