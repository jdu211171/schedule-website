// Column rules for teacher CSV import/export (mirrors student style)
export type TeacherColumnRule = {
  csvHeader: string;
  dbField: string;
  createRule: "required" | "optional" | "ignore";
  updateRule: "required" | "optional" | "ignore";
  exportOrder: number;
};

export const TEACHER_COLUMN_RULES: Record<string, TeacherColumnRule> = {
  name: {
    csvHeader: "名前",
    dbField: "name",
    createRule: "required",
    updateRule: "required",
    exportOrder: 1,
  },
  kanaName: {
    csvHeader: "カナ",
    dbField: "kanaName",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 2,
  },
  status: {
    csvHeader: "ステータス",
    dbField: "status",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 3,
  },
  birthDate: {
    csvHeader: "生年月日",
    dbField: "birthDate",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 4,
  },
  username: {
    csvHeader: "ユーザー名",
    dbField: "username",
    createRule: "required",
    updateRule: "required",
    exportOrder: 5,
  },
  email: {
    csvHeader: "メールアドレス",
    dbField: "email",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 6,
  },
  contactEmails: {
    csvHeader: "連絡先メール",
    dbField: "contactEmails",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 6.5 as any, // keep near primary email
  },
  password: {
    csvHeader: "パスワード",
    dbField: "password",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 7,
  },
  lineConnection: {
    csvHeader: "メッセージ連携",
    dbField: "lineConnection",
    createRule: "ignore",
    updateRule: "ignore",
    exportOrder: 8,
  },
  phoneNumber: {
    csvHeader: "携帯番号",
    dbField: "phoneNumber",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 9,
  },
  phoneNotes: {
    csvHeader: "電話番号備考",
    dbField: "phoneNotes",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 10,
  },
  branches: {
    csvHeader: "校舎",
    dbField: "branches",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 11,
  },
  subjects: {
    csvHeader: "選択科目",
    dbField: "subjects",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 12,
  },
  contactPhones: {
    csvHeader: "連絡先電話",
    dbField: "contactPhones",
    createRule: "optional",
    updateRule: "optional",
    // Placed after 備考 to avoid reordering existing columns by default
    exportOrder: 13.5 as any,
  },
  notes: {
    csvHeader: "備考",
    dbField: "notes",
    createRule: "optional",
    updateRule: "optional",
    exportOrder: 13,
  },
};

// Get CSV headers in the correct order
export const getTeacherOrderedCsvHeaders = (): string[] => {
  return Object.values(TEACHER_COLUMN_RULES)
    .sort((a, b) => a.exportOrder - b.exportOrder)
    .map((rule) => rule.csvHeader);
};

// Get columns to export (exclude ignored columns)
export const getTeacherExportColumns = (): TeacherColumnRule[] => {
  return Object.values(TEACHER_COLUMN_RULES)
    .filter(
      (rule) => rule.createRule !== "ignore" || rule.updateRule !== "ignore"
    )
    .sort((a, b) => a.exportOrder - b.exportOrder);
};

// Map CSV header to DB field
export const teacherCsvHeaderToDbField = (
  csvHeader: string
): string | undefined => {
  const entry = Object.values(TEACHER_COLUMN_RULES).find(
    (rule) => rule.csvHeader === csvHeader
  );
  return entry?.dbField;
};

// Map DB field to CSV header
export const teacherDbFieldToCsvHeader = (
  dbField: string
): string | undefined => {
  const entry = Object.values(TEACHER_COLUMN_RULES).find(
    (rule) => rule.dbField === dbField
  );
  return entry?.csvHeader;
};
