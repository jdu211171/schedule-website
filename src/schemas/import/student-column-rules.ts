// Column rules for student CSV import/export
export type ColumnRule = {
  csvHeader: string;
  dbField: string;
  createRule: 'required' | 'optional' | 'ignore';
  updateRule: 'required' | 'optional' | 'ignore';
  exportOrder: number;
};

export const STUDENT_COLUMN_RULES: Record<string, ColumnRule> = {
  name: {
    csvHeader: '名前',
    dbField: 'name',
    createRule: 'required',
    updateRule: 'required',
    exportOrder: 1,
  },
  kanaName: {
    csvHeader: 'カナ',
    dbField: 'kanaName',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 2,
  },
  status: {
    csvHeader: 'ステータス',
    dbField: 'status',
    createRule: 'ignore',
    updateRule: 'ignore',
    exportOrder: 3,
  },
  studentTypeName: {
    csvHeader: '生徒タイプ',
    dbField: 'studentTypeName',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 4,
  },
  gradeYear: {
    csvHeader: '学年',
    dbField: 'gradeYear',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 5,
  },
  birthDate: {
    csvHeader: '生年月日',
    dbField: 'birthDate',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 6,
  },
  schoolName: {
    csvHeader: '学校名',
    dbField: 'schoolName',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 7,
  },
  schoolType: {
    csvHeader: '学校種別',
    dbField: 'schoolType',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 8,
  },
  examCategory: {
    csvHeader: '受験区分',
    dbField: 'examCategory',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 9,
  },
  examCategoryType: {
    csvHeader: '受験区分種別',
    dbField: 'examCategoryType',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 10,
  },
  firstChoice: {
    csvHeader: '第一志望校',
    dbField: 'firstChoice',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 11,
  },
  secondChoice: {
    csvHeader: '第二志望校',
    dbField: 'secondChoice',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 12,
  },
  examDate: {
    csvHeader: '試験日',
    dbField: 'examDate',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 13,
  },
  username: {
    csvHeader: 'ユーザー名',
    dbField: 'username',
    createRule: 'required',
    updateRule: 'required',
    exportOrder: 14,
  },
  email: {
    csvHeader: 'メールアドレス',
    dbField: 'email',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 15,
  },
  parentEmail: {
    csvHeader: '保護者メール',
    dbField: 'parentEmail',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 16,
  },
  password: {
    csvHeader: 'パスワード',
    dbField: 'password',
    createRule: 'required',
    updateRule: 'optional',
    exportOrder: 17,
  },
  lineConnection: {
    csvHeader: 'メッセージ連携',
    dbField: 'lineConnection',
    createRule: 'ignore',
    updateRule: 'ignore',
    exportOrder: 18,
  },
  homePhone: {
    csvHeader: '自宅電話',
    dbField: 'homePhone',
    createRule: 'ignore',
    updateRule: 'ignore',
    exportOrder: 19,
  },
  parentPhone: {
    csvHeader: '保護者電話',
    dbField: 'parentPhone',
    createRule: 'ignore',
    updateRule: 'ignore',
    exportOrder: 20,
  },
  studentPhone: {
    csvHeader: '生徒電話',
    dbField: 'studentPhone',
    createRule: 'ignore',
    updateRule: 'ignore',
    exportOrder: 21,
  },
  branches: {
    csvHeader: '校舎',
    dbField: 'branches',
    createRule: 'required',
    updateRule: 'optional',
    exportOrder: 22,
  },
  subjects: {
    csvHeader: '選択科目',
    dbField: 'subjects',
    createRule: 'ignore',
    updateRule: 'ignore',
    exportOrder: 23,
  },
  notes: {
    csvHeader: '備考',
    dbField: 'notes',
    createRule: 'optional',
    updateRule: 'optional',
    exportOrder: 24,
  },
};

// Get CSV headers in the correct order
export const getOrderedCsvHeaders = (): string[] => {
  return Object.values(STUDENT_COLUMN_RULES)
    .sort((a, b) => a.exportOrder - b.exportOrder)
    .map(rule => rule.csvHeader);
};

// Get columns to export (exclude ignored columns)
export const getExportColumns = (): ColumnRule[] => {
  return Object.values(STUDENT_COLUMN_RULES)
    .filter(rule => rule.createRule !== 'ignore' || rule.updateRule !== 'ignore')
    .sort((a, b) => a.exportOrder - b.exportOrder);
};

// Get required fields for create/update
export const getRequiredFields = (mode: 'create' | 'update'): string[] => {
  return Object.entries(STUDENT_COLUMN_RULES)
    .filter(([_, rule]) => rule[`${mode}Rule`] === 'required')
    .map(([key, _]) => key);
};

// Map CSV header to DB field
export const csvHeaderToDbField = (csvHeader: string): string | undefined => {
  const entry = Object.values(STUDENT_COLUMN_RULES).find(rule => rule.csvHeader === csvHeader);
  return entry?.dbField;
};

// Map DB field to CSV header
export const dbFieldToCsvHeader = (dbField: string): string | undefined => {
  const entry = Object.values(STUDENT_COLUMN_RULES).find(rule => rule.dbField === dbField);
  return entry?.csvHeader;
};