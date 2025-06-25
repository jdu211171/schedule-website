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
    // Convert minutes to the appropriate timing values
    const timingConfigs = [
      { type: 'minutes', value: minutesBeforeClass },
      { type: 'hours', value: Math.round(minutesBeforeClass / 60) },
      { type: 'days', value: Math.round(minutesBeforeClass / 1440) }
    ];

    // Try to find a matching template based on timing
    let template = null;
    for (const config of timingConfigs) {
      if (config.value > 0) {
        template = await prisma.lineMessageTemplate.findFirst({
          where: {
            templateType: 'before_class',
            timingType: config.type as any,
            timingValue: config.value,
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
        if (template) break;
      }
    }

    if (!template) {
      // Fallback to hardcoded format if no template found
      return formatClassNotificationFallback(minutesBeforeClass, session);
    }

    // Prepare variables for replacement
    const variables: Record<string, string> = {
      studentName: session.studentName || '',
      teacherName: session.teacherName || '',
      subjectName: session.subjectName,
      classDate: format(session.startTime, 'yyyy年M月d日', { locale: ja }),
      startTime: format(session.startTime, 'HH:mm', { locale: ja }),
      endTime: format(session.endTime, 'HH:mm', { locale: ja }),
      duration: `${Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000)}分`,
      boothName: session.boothName || '',
      branchName: session.branchName || '',
      timeUntilClass: minutesBeforeClass < 60 ? `${minutesBeforeClass}分後` : `${Math.round(minutesBeforeClass / 60)}時間後`,
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
  
  if (minutesBeforeClass >= 1440) { // 24 hours or more
    return `📚 明日の授業のお知らせ\n\n` +
      `科目: ${session.subjectName}\n` +
      `日付: ${date}\n` +
      `時間: ${startTime}\n` +
      (session.teacherName ? `講師: ${session.teacherName}\n` : '') +
      (session.boothName ? `場所: ${session.boothName}\n` : '') +
      `\nよろしくお願いします！`;
  } else {
    return `⏰ まもなく授業が始まります！\n\n` +
      `科目: ${session.subjectName}\n` +
      `時間: ${startTime} (${minutesBeforeClass < 60 ? `${minutesBeforeClass}分後` : `${Math.round(minutesBeforeClass / 60)}時間後`})\n` +
      (session.teacherName ? `講師: ${session.teacherName}\n` : '') +
      (session.boothName ? `場所: ${session.boothName}\n` : '') +
      `\n準備をお願いします。`;
  }
}