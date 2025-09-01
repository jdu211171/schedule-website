// Teacher CSV Import Column Rules
// This file defines how each CSV column maps to database fields and import behavior

export interface ColumnRule {
  csvHeader: string;
  dbField: string;
  createRule: 'required' | 'optional' | 'ignore';
  updateRule: 'required' | 'optional' | 'ignore' | 'updateOnly';
  description?: string;
}

export const TEACHER_COLUMN_RULES: Record<string, ColumnRule> = {
  // Basic Information
  name: {
    csvHeader: '名前',
    dbField: 'name',
    createRule: 'required',
    updateRule: 'optional',
    description: '講師の名前'
  },
  kanaName: {
    csvHeader: 'カナ',
    dbField: 'kanaName',
    createRule: 'optional',
    updateRule: 'optional',
    description: '講師の名前（カナ）'
  },
  status: {
    csvHeader: 'ステータス',
    dbField: 'status',
    createRule: 'ignore',
    updateRule: 'ignore',
    description: 'ステータス（在籍/休会/退会）- システムで管理'
  },
  birthDate: {
    csvHeader: '生年月日',
    dbField: 'birthDate',
    createRule: 'optional',
    updateRule: 'optional',
    description: '生年月日（YYYY-MM-DD形式）'
  },

  // Account Information
  username: {
    csvHeader: 'ユーザー名',
    dbField: 'username',
    createRule: 'required',
    updateRule: 'required',
    description: 'ログイン用ユーザー名（英数字）'
  },
  email: {
    csvHeader: 'メールアドレス',
    dbField: 'email',
    createRule: 'optional',
    updateRule: 'optional',
    description: 'メールアドレス'
  },
  password: {
    csvHeader: 'パスワード',
    dbField: 'password',
    createRule: 'optional',
    updateRule: 'optional',
    description: 'パスワード（6文字以上）'
  },

  // LINE Integration
  lineId: {
    csvHeader: 'メッセージ連携',
    dbField: 'lineId',
    createRule: 'ignore',
    updateRule: 'ignore',
    description: 'LINE連携ID - システムで管理'
  },

  // Contact Information
  phoneNumber: {
    csvHeader: '携帯番号',
    dbField: 'phoneNumber',
    createRule: 'ignore',
    updateRule: 'ignore',
    description: '携帯電話番号'
  },
  phoneNotes: {
    csvHeader: '電話番号備考',
    dbField: 'phoneNotes',
    createRule: 'ignore',
    updateRule: 'ignore',
    description: '電話番号に関する備考（連絡可能時間など）'
  },

  // Organization
  branches: {
    csvHeader: '校舎',
    dbField: 'branches',
    createRule: 'optional',
    updateRule: 'optional',
    description: '所属校舎（セミコロン区切りで複数指定可）'
  },

  // Subjects
  subjects: {
    csvHeader: '選択科目',
    dbField: 'subjects',
    createRule: 'ignore',
    updateRule: 'ignore',
    description: '担当科目 - 別途管理画面で設定'
  },

  // Other
  notes: {
    csvHeader: '備考',
    dbField: 'notes',
    createRule: 'optional',
    updateRule: 'optional',
    description: '備考'
  }
};

// Get ordered CSV headers based on column rules
export function getOrderedCsvHeaders(): string[] {
  return Object.values(TEACHER_COLUMN_RULES).map(rule => rule.csvHeader);
}

// Get required fields based on operation mode
export function getRequiredFields(mode: 'create' | 'update'): string[] {
  return Object.entries(TEACHER_COLUMN_RULES)
    .filter(([_, rule]) => {
      if (mode === 'create') {
        return rule.createRule === 'required';
      } else {
        return rule.updateRule === 'required';
      }
    })
    .map(([field, _]) => field);
}

// Map CSV header to database field
export function csvHeaderToDbField(csvHeader: string): string | undefined {
  const rule = Object.values(TEACHER_COLUMN_RULES).find(r => r.csvHeader === csvHeader);
  return rule?.dbField;
}

// Get columns to include in export
export function getExportColumns(): string[] {
  return Object.entries(TEACHER_COLUMN_RULES)
    .filter(([_, rule]) =>
      rule.createRule !== 'ignore' ||
      rule.updateRule !== 'ignore'
    )
    .map(([field, _]) => field);
}
