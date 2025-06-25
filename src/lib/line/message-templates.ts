export const MESSAGE_VARIABLES = {
  // Student/Teacher variables
  STUDENT_NAME: {
    key: '{{studentName}}',
    label: '生徒名',
    description: '生徒の名前',
    example: '田中太郎'
  },
  TEACHER_NAME: {
    key: '{{teacherName}}',
    label: '講師名',
    description: '講師の名前',
    example: '山田先生'
  },
  
  // Class variables
  SUBJECT_NAME: {
    key: '{{subjectName}}',
    label: '科目名',
    description: '授業の科目名',
    example: '数学'
  },
  CLASS_DATE: {
    key: '{{classDate}}',
    label: '授業日',
    description: '授業の日付',
    example: '2024年1月15日'
  },
  CLASS_START_TIME: {
    key: '{{startTime}}',
    label: '開始時間',
    description: '授業の開始時間',
    example: '14:00'
  },
  CLASS_END_TIME: {
    key: '{{endTime}}',
    label: '終了時間',
    description: '授業の終了時間',
    example: '15:30'
  },
  CLASS_DURATION: {
    key: '{{duration}}',
    label: '授業時間',
    description: '授業の長さ（分）',
    example: '90分'
  },
  
  // Location variables
  BOOTH_NAME: {
    key: '{{boothName}}',
    label: 'ブース名',
    description: '授業を行うブース',
    example: 'ブース A'
  },
  BRANCH_NAME: {
    key: '{{branchName}}',
    label: '校舎名',
    description: '校舎の名前',
    example: '東京校'
  },
  
  // Time-related variables
  TIME_UNTIL_CLASS: {
    key: '{{timeUntilClass}}',
    label: '授業までの時間',
    description: '授業開始までの時間',
    example: '30分後'
  },
  CURRENT_DATE: {
    key: '{{currentDate}}',
    label: '現在の日付',
    description: '今日の日付',
    example: '2024年1月14日'
  },
  CURRENT_TIME: {
    key: '{{currentTime}}',
    label: '現在時刻',
    description: '現在の時刻',
    example: '13:30'
  }
} as const;

export type MessageVariable = keyof typeof MESSAGE_VARIABLES;

export interface MessageTemplate {
  id?: string;
  name: string;
  description?: string;
  templateType: 'before_class' | 'after_class' | 'custom';
  timingType: 'minutes' | 'hours' | 'days';
  timingValue: number;
  content: string;
  variables: string[];
  isActive: boolean;
  branchId?: string;
}

// Function to get default templates with unique IDs
export const getDefaultTemplates = (): MessageTemplate[] => [
  {
    id: `default-24h-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '24時間前リマインダー',
    description: '授業の24時間前に送信される通知',
    templateType: 'before_class',
    timingType: 'hours',
    timingValue: 24,
    content: `📚 明日の授業のお知らせ

科目: {{subjectName}}
日付: {{classDate}}
時間: {{startTime}} - {{endTime}}
講師: {{teacherName}}
場所: {{boothName}}

よろしくお願いします！`,
    variables: ['subjectName', 'classDate', 'startTime', 'endTime', 'teacherName', 'boothName'],
    isActive: true
  },
  {
    id: `default-30m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '30分前リマインダー',
    description: '授業の30分前に送信される通知',
    templateType: 'before_class',
    timingType: 'minutes',
    timingValue: 30,
    content: `⏰ まもなく授業が始まります！

科目: {{subjectName}}
時間: {{startTime}} ({{timeUntilClass}})
講師: {{teacherName}}
場所: {{boothName}}

準備をお願いします。`,
    variables: ['subjectName', 'startTime', 'timeUntilClass', 'teacherName', 'boothName'],
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