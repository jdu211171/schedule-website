import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { replaceTemplateVariables } from "./message-templates";

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
        templateType: "before_class",
        timingType: "days",
        timingValue: daysBeforeClass,
        isActive: true,
        OR: [
          { branchId: branchId },
          { branchId: null }, // Fallback to global template
        ],
      },
      orderBy: [
        { branchId: "desc" }, // Prefer branch-specific template
        { updatedAt: "desc" },
      ],
    });

    if (!template) {
      // Fallback to default templates if no database template found
      return await formatClassNotificationFallback(minutesBeforeClass, session);
    }

    // Prepare variables for replacement
    // Note: This function is kept for backward compatibility but should not be used.
    // The new notification system uses daily summaries with different variables.
    const variables: Record<string, string> = {
      currentDate: format(new Date(), "yyyy年M月d日", { locale: ja }),
      currentTime: format(new Date(), "HH:mm", { locale: ja }),
    };

    // Replace variables in template
    return replaceTemplateVariables(template.content, variables);
  } catch (error) {
    console.error("Error formatting notification with template:", error);
    // Fallback to default templates on error
    return await formatClassNotificationFallback(minutesBeforeClass, session);
  }
}

// Default template configurations - these should eventually be moved to database
const DEFAULT_TEMPLATES = {
  0: {
    content: `⏰ 本日の授業のお知らせ

科目: {{subjectName}}
時間: {{startTime}}
{{#teacherName}}講師: {{teacherName}}
{{/teacherName}}{{#boothName}}場所: {{boothName}}
{{/boothName}}
本日もよろしくお願いします。`,
  },
  1: {
    content: `📚 明日の授業のお知らせ

科目: {{subjectName}}
日付: {{date}}
時間: {{startTime}}
{{#teacherName}}講師: {{teacherName}}
{{/teacherName}}{{#boothName}}場所: {{boothName}}
{{/boothName}}
よろしくお願いします！`,
  },
  default: {
    content: `📅 授業予定のお知らせ

{{date}}に以下の授業があります。

科目: {{subjectName}}
時間: {{startTime}}
{{#teacherName}}講師: {{teacherName}}
{{/teacherName}}{{#boothName}}場所: {{boothName}}
{{/boothName}}
ご確認をお願いします。`,
  },
};

// Enhanced fallback function that uses default templates and could be extended to fetch from database
async function formatClassNotificationFallback(
  minutesBeforeClass: number,
  session: ClassSessionData
): Promise<string> {
  const date = format(session.startTime, "yyyy年M月d日", { locale: ja });
  const startTime = format(session.startTime, "HH:mm", { locale: ja });
  const daysBeforeClass = Math.round(minutesBeforeClass / 1440);

  // Get appropriate template
  const templateKey =
    daysBeforeClass in DEFAULT_TEMPLATES ? daysBeforeClass : "default";
  const template =
    DEFAULT_TEMPLATES[templateKey as keyof typeof DEFAULT_TEMPLATES];

  // Prepare variables for replacement
  const variables: Record<string, string> = {
    subjectName: session.subjectName,
    date,
    startTime,
    teacherName: session.teacherName || "",
    boothName: session.boothName || "",
  };

  // Simple template replacement (using existing function from message-templates)
  return replaceTemplateVariables(template.content, variables);
}
