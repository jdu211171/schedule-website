import { z } from "zod";

export const studentImportSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください")
    .regex(/^[a-zA-Z0-9_-]+$/, "ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます"),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .max(100, "メールアドレスは100文字以下で入力してください"),
  password: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || val.length >= 8, {
      message: "パスワードは8文字以上で入力してください"
    })
    .refine(val => !val || val.length <= 100, {
      message: "パスワードは100文字以下で入力してください"
    }),
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以下で入力してください"),
  studentTypeName: z
    .string()
    .min(1, "生徒タイプは必須です"),
  kanaName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  gradeYear: z
    .string()
    .transform(val => val === "" ? 1 : parseInt(val, 10))
    .pipe(z.number().int().min(1, "学年は1以上で入力してください"))
    .default("1"),
  lineId: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  subjects: z
    .string()
    .transform(val => val === "" ? [] : val.split(",").map(name => name.trim()))
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
  notes: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  // School information
  schoolName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  schoolType: z
    .string()
    .transform(val => {
      if (val === "" || !val) return null;
      if (val.toUpperCase() === "PUBLIC" || val === "公立") return "PUBLIC";
      if (val.toUpperCase() === "PRIVATE" || val === "私立") return "PRIVATE";
      return null;
    })
    .nullable()
    .optional(),
  // Exam information
  examCategory: z
    .string()
    .transform(val => {
      if (val === "" || !val) return null;
      if (val.toUpperCase() === "BEGINNER" || val === "初級") return "BEGINNER";
      if (val.toUpperCase() === "ELEMENTARY" || val === "小学校") return "ELEMENTARY";
      if (val.toUpperCase() === "HIGH_SCHOOL" || val === "高校") return "HIGH_SCHOOL";
      if (val.toUpperCase() === "UNIVERSITY" || val === "大学") return "UNIVERSITY";
      return null;
    })
    .nullable()
    .optional(),
  examCategoryType: z
    .string()
    .transform(val => {
      if (val === "" || !val) return null;
      if (val.toUpperCase() === "PUBLIC" || val === "公立") return "PUBLIC";
      if (val.toUpperCase() === "PRIVATE" || val === "私立") return "PRIVATE";
      return null;
    })
    .nullable()
    .optional(),
  firstChoice: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  secondChoice: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  examDate: z
    .string()
    .transform(val => val === "" ? null : val)
    .pipe(z.coerce.date().nullable().optional())
    .optional(),
  // Contact information
  homePhone: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  parentPhone: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  studentPhone: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  parentEmail: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  // Personal information
  birthDate: z
    .string()
    .transform(val => val === "" ? null : val)
    .pipe(z.coerce.date().nullable().optional())
    .optional(),
});

export type StudentImportData = z.infer<typeof studentImportSchema>;

export const STUDENT_CSV_HEADERS = [
  "username", 
  "email", 
  "password", 
  "name", 
  "kanaName",
  "studentTypeName", 
  "gradeYear", 
  "lineId",
  "subjects",
  "branches",
  "schoolName",
  "schoolType",
  "examCategory",
  "examCategoryType",
  "firstChoice",
  "secondChoice",
  "examDate",
  "homePhone",
  "parentPhone",
  "studentPhone",
  "parentEmail",
  "birthDate",
  "notes"
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_STUDENT_CSV_HEADERS = [
  "username",
  "email", 
  "name",
  "studentTypeName"
] as const;