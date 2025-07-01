import { Prisma } from '@prisma/client';

interface ErrorContext {
  entity?: string;
  operation?: 'create' | 'update' | 'delete' | 'read';
  field?: string;
}

const ERROR_MESSAGES: Record<string, (context?: ErrorContext) => string> = {
  P2002: (context) => {
    const entity = context?.entity || 'データ';
    return `この${entity}は既に存在します`;
  },
  P2003: (context) => {
    const entity = context?.entity || 'データ';
    return `関連するデータがあるため、この${entity}を削除できません`;
  },
  P2025: (context) => {
    const entity = context?.entity || 'データ';
    return `${entity}が見つかりません`;
  },
  P2014: (context) => {
    const entity = context?.entity || 'データ';
    return `この${entity}は他のデータと関連しているため、変更できません`;
  },
  P2016: () => 'データベースのクエリに問題があります',
  P2017: () => 'データの関連性に問題があります',
  P2018: () => '必要なデータが見つかりません',
  P2019: () => '入力データにエラーがあります',
  P2020: () => '値が範囲外です',
  P2021: () => 'データベーステーブルが存在しません',
  P2022: () => 'データベースのカラムが存在しません',
  P2023: () => 'データの整合性に問題があります',
  P2024: () => 'データベース接続がタイムアウトしました',
  P2027: () => 'データベースでエラーが発生しました',
};

const ENTITY_NAMES: Record<string, string> = {
  user: 'ユーザー',
  branch: 'ブランチ',
  subject: '科目',
  classtype: 'クラスタイプ',
  teacher: '講師',
  student: '生徒',
  booth: 'ブース',
  classsession: '授業',
  attendance: '出席記録',
  level: 'レベル',
};

const FOREIGN_KEY_ENTITY_MAP: Record<string, string> = {
  'ClassSession_subjectId_fkey': '授業',
  'ClassSession_teacherId_fkey': '授業',
  'ClassSession_studentId_fkey': '授業',
  'ClassSession_boothId_fkey': '授業',
  'ClassSession_classTypeId_fkey': '授業',
  'ClassType_parentId_fkey': '子クラスタイプ',
  'Teacher_userId_fkey': '講師',
  'Student_userId_fkey': '生徒',
  'UserBranch_userId_fkey': 'ユーザーのブランチ割り当て',
  'UserBranch_branchId_fkey': 'ユーザー',
  'Subject_branchId_fkey': '科目',
  'Booth_branchId_fkey': 'ブース',
  'Student_branchId_fkey': '生徒',
  'Teacher_branchId_fkey': '講師',
  'ClassType_branchId_fkey': 'クラスタイプ',
  'Level_branchId_fkey': 'レベル',
  'StudentLevel_studentId_fkey': 'レベル設定',
  'StudentLevel_levelId_fkey': '生徒',
  'StudentLevel_subjectId_fkey': 'レベル設定',
};

export function handlePrismaError(
  error: unknown,
  context?: ErrorContext
): { error: string; status: number; code?: string } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const messageGenerator = ERROR_MESSAGES[error.code];
    
    if (messageGenerator) {
      const errorContext = { ...context };
      
      if (error.code === 'P2003' && error.meta?.field_name) {
        const fieldName = error.meta.field_name as string;
        const relatedEntity = FOREIGN_KEY_ENTITY_MAP[fieldName];
        if (relatedEntity) {
          const entity = errorContext.entity || 'データ';
          const message = `${relatedEntity}で使用されているため、この${entity}を削除できません`;
          return { error: message, status: 400, code: error.code };
        }
      }
      
      if (errorContext.entity && ENTITY_NAMES[errorContext.entity.toLowerCase()]) {
        errorContext.entity = ENTITY_NAMES[errorContext.entity.toLowerCase()];
      }
      
      const message = messageGenerator(errorContext);
      return { error: message, status: 400, code: error.code };
    }
    
    return { 
      error: 'データベースエラーが発生しました',
      status: 500,
      code: error.code
    };
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return { error: '入力データが正しくありません', status: 400 };
  }
  
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { error: 'システムエラーが発生しました', status: 500 };
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { error: 'データベース接続エラーが発生しました', status: 500 };
  }
  
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return { error: '予期しないエラーが発生しました', status: 500 };
  }
  
  return { error: 'エラーが発生しました', status: 500 };
}