export const MESSAGE_VARIABLES = {
  // Daily summary variables
  DAILY_CLASS_LIST: {
    key: '{{dailyClassList}}',
    label: '授業リスト（詳細）',
    description: 'その日の全授業の詳細リスト',
    example: `【1】数学
時間: 10:00 - 11:30
講師: 田中先生
場所: ブース A

【2】英語
時間: 14:00 - 15:30
講師: 山田先生
場所: ブース B`
  },
  
  // Recipient variables
  RECIPIENT_NAME: {
    key: '{{recipientName}}',
    label: '受信者名',
    description: '通知を受け取る人の名前',
    example: '田中太郎'
  },
  RECIPIENT_TYPE: {
    key: '{{recipientType}}',
    label: '受信者種別',
    description: '講師または生徒',
    example: '生徒'
  },
  
  // Date variables  
  CLASS_DATE: {
    key: '{{classDate}}',
    label: '授業日',
    description: '授業の日付',
    example: '2024年1月15日'
  },
  CURRENT_DATE: {
    key: '{{currentDate}}',
    label: '現在の日付',
    description: '今日の日付',
    example: '2024年1月14日'
  },
  
  // Class summary variables
  CLASS_COUNT: {
    key: '{{classCount}}',
    label: '授業数',
    description: 'その日の授業の総数',
    example: '3'
  },
  FIRST_CLASS_TIME: {
    key: '{{firstClassTime}}',
    label: '最初の授業時間',
    description: '最初の授業の開始時間',
    example: '10:00'
  },
  LAST_CLASS_TIME: {
    key: '{{lastClassTime}}',
    label: '最後の授業時間',
    description: '最後の授業の終了時間',
    example: '18:30'
  },
  TOTAL_DURATION: {
    key: '{{totalDuration}}',
    label: '総授業時間',
    description: '全授業の合計時間',
    example: '4.5時間'
  },
  
  // Lists
  TEACHER_NAMES: {
    key: '{{teacherNames}}',
    label: '講師名一覧',
    description: '全講師の名前（カンマ区切り）',
    example: '田中先生、山田先生'
  },
  SUBJECT_NAMES: {
    key: '{{subjectNames}}',
    label: '科目名一覧',
    description: '全科目の名前（カンマ区切り）',
    example: '数学、英語、物理'
  },
  
  // Branch info
  BRANCH_NAME: {
    key: '{{branchName}}',
    label: '校舎名',
    description: '校舎の名前',
    example: '東京校'
  }
} as const;

// Class item variables for customizing the format of each class in the list
export const CLASS_ITEM_VARIABLES = {
  CLASS_NUMBER: {
    key: '{{classNumber}}',
    label: '授業番号',
    description: 'リスト内の授業番号',
    example: '1'
  },
  SUBJECT_NAME: {
    key: '{{subjectName}}',
    label: '科目名',
    description: '授業の科目名',
    example: '数学'
  },
  START_TIME: {
    key: '{{startTime}}',
    label: '開始時間',
    description: '授業の開始時間',
    example: '10:00'
  },
  END_TIME: {
    key: '{{endTime}}',
    label: '終了時間',
    description: '授業の終了時間',
    example: '11:30'
  },
  TEACHER_NAME: {
    key: '{{teacherName}}',
    label: '講師名',
    description: '授業を担当する講師名',
    example: '田中先生'
  },
  BOOTH_NAME: {
    key: '{{boothName}}',
    label: 'ブース名',
    description: '授業が行われる場所',
    example: 'ブース A'
  },
  DURATION: {
    key: '{{duration}}',
    label: '授業時間',
    description: '授業の長さ（分）',
    example: '90分'
  },
  STUDENT_NAME: {
    key: '{{studentName}}',
    label: '生徒名',
    description: '1対1授業の生徒名',
    example: '山田太郎'
  },
  STUDENT_NAMES: {
    key: '{{studentNames}}',
    label: '生徒名一覧',
    description: '全生徒の名前（カンマ区切り）',
    example: '山田太郎、田中花子、佐藤次郎'
  },
  STUDENT_COUNT: {
    key: '{{studentCount}}',
    label: '生徒数',
    description: '授業に参加する生徒の人数',
    example: '3'
  },
  CLASS_TYPE: {
    key: '{{classType}}',
    label: '授業タイプ',
    description: '授業の形式（1対1またはグループ）',
    example: '1対1'
  }
} as const;

export type MessageVariable = keyof typeof MESSAGE_VARIABLES;

export interface MessageTemplate {
  id?: string;
  name: string;
  description?: string;
  templateType: 'before_class';
  timingType: 'days'; // Now only supports days-based timing
  timingValue: number; // Number of days before class
  timingHour: number; // Hour (0-23) when notification should be sent (now required)
  timingMinute?: number; // Minute (0-59) when notification should be sent
  content: string;
  variables: string[];
  classListItemTemplate?: string; // Template for each class item in the list
  classListSummaryTemplate?: string; // Template for the summary line
  isActive: boolean;
  branchId?: string;
}

// Default templates for class list formatting
export const DEFAULT_CLASS_LIST_ITEM_TEMPLATE = `【{{classNumber}}】{{subjectName}}
時間: {{startTime}} - {{endTime}}
講師: {{teacherName}}
場所: {{boothName}}`;

export const DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE = `計{{classCount}}件の授業があります。`;

// Class list format examples
export const CLASS_LIST_FORMAT_EXAMPLES = {
  DETAILED: {
    name: '詳細形式',
    itemTemplate: `【{{classNumber}}】{{subjectName}}
時間: {{startTime}} - {{endTime}}
講師: {{teacherName}}
場所: {{boothName}}`,
    summaryTemplate: `計{{classCount}}件の授業があります。`
  },
  COMPACT: {
    name: 'コンパクト形式',
    itemTemplate: `{{classNumber}}. {{startTime}}-{{endTime}} {{subjectName}} ({{teacherName}})`,
    summaryTemplate: `全{{classCount}}件`
  },
  SIMPLE: {
    name: 'シンプル形式',
    itemTemplate: `{{classNumber}}. {{subjectName}} {{startTime}}-{{endTime}}`,
    summaryTemplate: `{{classCount}}件の授業`
  },
  TIME_FOCUSED: {
    name: '時間重視形式',
    itemTemplate: `{{startTime}} {{subjectName}} ({{duration}})`,
    summaryTemplate: `{{classCount}}件 ({{firstClassTime}}〜{{lastClassTime}})`
  }
};

// Template examples for users to choose from
export const TEMPLATE_EXAMPLES = {
  DETAILED: {
    name: '詳細版',
    content: `{{recipientName}}様

{{classDate}}の授業予定をお知らせします。

{{dailyClassList}}

本日の授業: {{classCount}}件
開始時間: {{firstClassTime}}
終了時間: {{lastClassTime}}
総授業時間: {{totalDuration}}

よろしくお願いいたします。

{{branchName}}`
  },
  SIMPLE: {
    name: 'シンプル版',
    content: `{{classDate}}の授業

{{dailyClassList}}

よろしくお願いします。`
  },
  COMPACT: {
    name: 'コンパクト版',
    content: `【{{classDate}}の授業】
科目: {{subjectNames}}
時間: {{firstClassTime}}〜{{lastClassTime}} (計{{classCount}}件)
講師: {{teacherNames}}

詳細は以下の通りです：
{{dailyClassList}}`
  },
  PERSONALIZED: {
    name: 'パーソナル版',
    content: `{{recipientName}}{{recipientType}}へ

明日（{{classDate}}）の授業は{{classCount}}件です。
最初の授業は{{firstClassTime}}から始まります。

{{dailyClassList}}

{{branchName}}でお待ちしております。`
  }
};

// Function to get default template (single notification)
export const getDefaultTemplates = (): MessageTemplate[] => [
  {
    id: `default-daily-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '毎日の授業通知',
    description: '指定した日数前に送信される授業リマインダー',
    templateType: 'before_class',
    timingType: 'days',
    timingValue: 1,
    timingHour: 9,
    timingMinute: 0,
    content: TEMPLATE_EXAMPLES.DETAILED.content,
    variables: extractTemplateVariables(TEMPLATE_EXAMPLES.DETAILED.content),
    classListItemTemplate: DEFAULT_CLASS_LIST_ITEM_TEMPLATE,
    classListSummaryTemplate: DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE,
    isActive: true
  }
];

// For backward compatibility
export const DEFAULT_TEMPLATES = getDefaultTemplates();

/**
 * Replace variables in a template with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

/**
 * Extract variable names from a template string
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /{{(\w+)}}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}