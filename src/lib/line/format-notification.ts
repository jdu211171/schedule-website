import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { prisma } from '@/lib/prisma';
import { replaceTemplateVariables } from './message-templates';

export interface ClassSessionData {
  subjectName: string;
  startTime: Date;
  endTime: Date;
  teacherName?: string;
  studentName?: string;
  boothName?: string;
  branchName?: string;
  branchId?: string;
}

export async function formatClassNotificationWithTemplate(
  session: ClassSessionData,
  minutesBeforeClass: number,
  branchId?: string
): Promise<string> {
  try {
    // Convert minutes to days for template matching
    const daysBeforeClass = Math.round(minutesBeforeClass / 1440);

    // Try to find a matching template based on days
    const template = await prisma.lineMessageTemplate.findFirst({
      where: {
        templateType: 'before_class',
        timingType: 'days',
        timingValue: daysBeforeClass,
        isActive: true,
        OR: [
          { branchId: branchId },
          { branchId: null } // Fallback to global template
        ]
      },
      orderBy: [
        { branchId: 'desc' }, // Prefer branch-specific template
        { updatedAt: 'desc' }
      ]
    });

    if (!template) {
      // Fallback to hardcoded format if no template found
      return formatClassNotificationFallback(minutesBeforeClass, session);
    }

    // Prepare variables for replacement
    // Note: This function is kept for backward compatibility but should not be used.
    // The new notification system uses daily summaries with different variables.
    const variables: Record<string, string> = {
      currentDate: format(new Date(), 'yyyy年M月d日', { locale: ja }),
      currentTime: format(new Date(), 'HH:mm', { locale: ja })
    };

    // Replace variables in template
    return replaceTemplateVariables(template.content, variables);
  } catch (error) {
    console.error('Error formatting notification with template:', error);
    // Fallback to hardcoded format on error
    return formatClassNotificationFallback(minutesBeforeClass, session);
  }
}

// Fallback function for when templates are not available
function formatClassNotificationFallback(
  minutesBeforeClass: number,
  session: ClassSessionData
): string {
  const date = format(session.startTime, 'yyyy年M月d日', { locale: ja });
  const startTime = format(session.startTime, 'HH:mm', { locale: ja });
  const daysBeforeClass = Math.round(minutesBeforeClass / 1440);
  
  if (daysBeforeClass === 0) {
    return `⏰ 本日の授業のお知らせ\n\n` +
      `科目: ${session.subjectName}\n` +
      `時間: ${startTime}\n` +
      (session.teacherName ? `講師: ${session.teacherName}\n` : '') +
      (session.boothName ? `場所: ${session.boothName}\n` : '') +
      `\n本日もよろしくお願いします。`;
  } else if (daysBeforeClass === 1) {
    return `📚 明日の授業のお知らせ\n\n` +
      `科目: ${session.subjectName}\n` +
      `日付: ${date}\n` +
      `時間: ${startTime}\n` +
      (session.teacherName ? `講師: ${session.teacherName}\n` : '') +
      (session.boothName ? `場所: ${session.boothName}\n` : '') +
      `\nよろしくお願いします！`;
  } else {
    return `📅 授業予定のお知らせ\n\n` +
      `${date}に以下の授業があります。\n\n` +
      `科目: ${session.subjectName}\n` +
      `時間: ${startTime}\n` +
      (session.teacherName ? `講師: ${session.teacherName}\n` : '') +
      (session.boothName ? `場所: ${session.boothName}\n` : '') +
      `\nご確認をお願いします。`;
  }
}