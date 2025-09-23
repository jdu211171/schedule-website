import { z } from "zod";

export const studentImportSchema = z.object({
  // Status (import from export): 在籍/休会/退会 or ACTIVE/SICK/PERMANENTLY_LEFT
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const s = String(val).trim();
      if (s === "") return null;
      const upper = s.toUpperCase();
      if (upper === "ACTIVE" || s === "在籍") return "ACTIVE" as const;
      if (upper === "SICK" || s === "休会") return "SICK" as const;
      if (upper === "PERMANENTLY_LEFT" || s === "退会") return "PERMANENTLY_LEFT" as const;
      return null; // unknown → null (warning will be added by importer)
    })
    .nullable()
    .optional(),
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください"),
  email: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "有効なメールアドレスを入力してください"
    })
    .refine(val => !val || val.length <= 100, {
      message: "メールアドレスは100文字以下で入力してください"
    }),
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
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  kanaName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  gradeYear: z
    .string()
    .transform(val => val === "" ? null : parseInt(val, 10))
    .pipe(z.number().int().min(1, "学年は1以上で入力してください").nullable().optional())
    .optional(),
  lineId: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  branches: z
    .string()
    .transform(val => val === "" ? [] : val.split(";").map(name => name.trim()))
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
  // Subject preferences (e.g., "数学 - 文系; 英語 - 受験")
  subjects: z
    .string()
    .optional()
    .default("")
    .transform((v) => v ?? ""),
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
      if (val.toUpperCase() === "BEGINNER" || val === "小学校") return "BEGINNER";
      if (val.toUpperCase() === "ELEMENTARY" || val === "中学校") return "ELEMENTARY";
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
  // Admission date
  admissionDate: z
    .string()
    .transform(val => val === "" ? null : val)
    .pipe(z.coerce.date().nullable().optional())
    .optional(),
  // Contact phones aggregated column (e.g., "自宅:03-...; 父:090-...; 母:080-...")
  contactPhones: z
    .string()
    .optional()
    .default("")
    .transform((v) => v ?? ""),
  // Contact emails aggregated column (e.g., "taro@example.com:本人; mother@example.com:母")
  contactEmails: z
    .string()
    .optional()
    .default("")
    .transform((v) => v ?? ""),
});

export type StudentImportData = z.infer<typeof studentImportSchema>;

// Schema for update operations - all fields except username are optional
export const studentUpdateImportSchema = z.object({
  // Status (import from export): 在籍/休会/退会 or ACTIVE/SICK/PERMANENTLY_LEFT
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const s = String(val).trim();
      if (s === "") return null;
      const upper = s.toUpperCase();
      if (upper === "ACTIVE" || s === "在籍") return "ACTIVE" as const;
      if (upper === "SICK" || s === "休会") return "SICK" as const;
      if (upper === "PERMANENTLY_LEFT" || s === "退会") return "PERMANENTLY_LEFT" as const;
      return null; // unknown → null (warning will be added by importer)
    })
    .nullable()
    .optional(),
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください")
    .optional(),
  email: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional()
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "有効なメールアドレスを入力してください"
    })
    .refine(val => !val || val.length <= 100, {
      message: "メールアドレスは100文字以下で入力してください"
    }),
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
    .max(100, "名前は100文字以下で入力してください")
    .optional(),
  studentTypeName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  kanaName: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  gradeYear: z
    .string()
    .transform(val => val === "" ? null : parseInt(val, 10))
    .pipe(z.number().int().min(1, "学年は1以上で入力してください").nullable().optional())
    .optional(),
  lineId: z
    .string()
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  branches: z
    .string()
    .transform(val => val === "" ? [] : val.split(";").map(name => name.trim()))
    .pipe(z.array(z.string().min(1)))
    .optional()
    .default(""),
  // Subject preferences (e.g., "数学 - 文系; 英語 - 受験")
  subjects: z
    .string()
    .optional()
    .default("")
    .transform((v) => v ?? ""),
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
      if (val.toUpperCase() === "BEGINNER" || val === "小学校") return "BEGINNER";
      if (val.toUpperCase() === "ELEMENTARY" || val === "中学校") return "ELEMENTARY";
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
  // Admission date
  admissionDate: z
    .string()
    .transform(val => val === "" ? null : val)
    .pipe(z.coerce.date().nullable().optional())
    .optional(),
  // Contact phones aggregated column
  contactPhones: z
    .string()
    .optional()
    .default("")
    .transform((v) => v ?? ""),
  // Contact emails aggregated column
  contactEmails: z
    .string()
    .optional()
    .default("")
    .transform((v) => v ?? ""),
});

export type StudentUpdateImportData = z.infer<typeof studentUpdateImportSchema>;

// This is now generated from column rules
export const STUDENT_CSV_HEADERS = [
  "名前",
  "カナ",
  "ステータス",
  "生徒タイプ",
  "学年",
  "生年月日",
  "入会日",
  "学校名",
  "学校種別",
  "受験区分",
  "受験区分種別",
  "第一志望校",
  "第二志望校",
  "試験日",
  "ユーザー名",
  "メールアドレス",
  "保護者メール",
  "パスワード",
  "メッセージ連携",
  "自宅電話",
  "保護者電話",
  "生徒電話",
  "校舎",
  "選択科目",
  "備考"
] as const;

// Required headers that must be present in the CSV
export const REQUIRED_STUDENT_CSV_HEADERS = [
  "username",
  "name"
] as const;
