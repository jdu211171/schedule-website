import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification/notification-service';
import { addDays, format, startOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { replaceTemplateVariables, DEFAULT_CLASS_LIST_ITEM_TEMPLATE, DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE } from '@/lib/line/message-templates';
import { withRole } from '@/lib/auth';

const TIMEZONE = 'Asia/Tokyo';

async function processNotifications(skipTimeCheck: boolean = false) {
  const now = new Date();
  const nowJST = toZonedTime(now, TIMEZONE);

  console.log('=== NOTIFICATION PROCESSING STARTED ===');
  console.log('Current time (UTC):', now.toISOString());
  console.log('Current time (JST):', formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss zzz'));
  console.log('Skip time check:', skipTimeCheck);
  console.log('Current hour (JST):', nowJST.getHours());

  const activeTemplates = await prisma.lineMessageTemplate.findMany({
    where: {
      templateType: 'before_class',
      isActive: true,
      branchId: null
    },
    select: {
      id: true,
      name: true,
      timingType: true,
      timingValue: true,
      timingHour: true,
      branchId: true,
      content: true,
      classListItemTemplate: true,
      classListSummaryTemplate: true,
      branch: {
        select: {
          name: true
        }
      }
    }
  });

  console.log(`Found ${activeTemplates.length} active templates`);
  activeTemplates.forEach(template => {
    console.log(`- Template: ${template.name} (ID: ${template.id})`);
    console.log(`  Timing: ${template.timingValue} days before at ${template.timingHour}:00 JST`);
    console.log(`  Branch: ${template.branchId || 'Global'}`);
  });

  let totalNotificationsSent = 0;
  const errors: string[] = [];

  for (const template of activeTemplates) {
    try {
      const shouldSend = nowJST.getHours() >= template.timingHour;
      if (!skipTimeCheck && !shouldSend) {
        console.log(`⏰ Waiting for scheduled hour: ${template.timingHour}:00. Current hour: ${nowJST.getHours()}`);
        continue;
      }

      const targetDate = startOfDay(addDays(nowJST, template.timingValue));
      const targetDateString = format(targetDate, 'yyyy-MM-dd');

      const todayStartJST = startOfDay(nowJST);
      // Convert JST to UTC for database comparison
      const todayStartUTC = fromZonedTime(todayStartJST, TIMEZONE);
      
      // Debug logging for timezone conversion
      console.log(`\n  Checking for duplicate notifications:`);
      console.log(`    Today start (JST): ${format(todayStartJST, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`    Today start (UTC): ${format(todayStartUTC, 'yyyy-MM-dd HH:mm:ss')}`);

      const alreadyProcessed = await prisma.notification.count({
        where: {
          targetDate: targetDate,
          notificationType: {
            contains: template.timingValue === 0 ? 'SAMEDAY' :
                      template.timingValue === 1 ? '24H' :
                      `${template.timingValue}D`
          },
          createdAt: {
            gte: todayStartUTC  // Compare UTC with UTC
          }
        }
      });

      if (!skipTimeCheck && alreadyProcessed > 0) {
        console.log(`✅ Already processed today for ${template.name} (target: ${targetDateString})`);
        continue;
      }

      console.log(`\n🔄 Processing template: ${template.name}`);
      console.log(`  Days before: ${template.timingValue}`);
      console.log(`  Target date for classes: ${targetDateString}`);
      console.log(`  Target date object (JST): ${format(targetDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`  Template ID: ${template.id}`);

      const teachersWithClasses = await prisma.teacher.findMany({
        where: {
          lineNotificationsEnabled: true,
          lineId: { not: null },
          classSessions: {
            some: {
              date: targetDate
            }
          }
        },
        select: {
          teacherId: true,
          name: true,
          lineId: true,
          classSessions: {
            where: { date: targetDate },
            orderBy: { startTime: 'asc' },
            include: {
              student: { select: { studentId: true, name: true } },
              studentClassEnrollments: { include: { student: { select: { studentId: true, name: true } } } },
              subject: { select: { name: true } },
              booth: { select: { name: true } },
              branch: { select: { name: true } }
            }
          }
        }
      });

      const studentsWithDirectClasses = await prisma.student.findMany({
        where: {
          lineNotificationsEnabled: true,
          lineId: { not: null },
          classSessions: {
            some: {
              date: targetDate
            }
          }
        },
        select: {
          studentId: true,
          name: true,
          lineId: true,
          classSessions: {
            where: { date: targetDate },
            orderBy: { startTime: 'asc' },
            include: {
              teacher: { select: { teacherId: true, name: true } },
              subject: { select: { name: true } },
              booth: { select: { name: true } },
              branch: { select: { name: true } }
            }
          }
        }
      });

      const studentsWithEnrolledClasses = await prisma.student.findMany({
        where: {
          lineNotificationsEnabled: true,
          lineId: { not: null },
          studentClassEnrollments: {
            some: {
              classSession: {
                date: targetDate
              }
            }
          }
        },
        select: {
          studentId: true,
          name: true,
          lineId: true,
          studentClassEnrollments: {
            where: {
              classSession: {
                date: targetDate
              }
            },
            include: {
              classSession: {
                include: {
                  teacher: { select: { teacherId: true, name: true } },
                  student: { select: { studentId: true, name: true } },
                  subject: { select: { name: true } },
                  booth: { select: { name: true } },
                  branch: { select: { name: true } }
                }
              }
            }
          }
        }
      });

      const recipientSessions = new Map<string, { recipientType: 'TEACHER' | 'STUDENT'; recipientId: string; lineId: string; name: string; sessions: any[]; }>();

      for (const teacher of teachersWithClasses) {
        if (teacher.lineId) {
          recipientSessions.set(`teacher-${teacher.teacherId}`, { recipientType: 'TEACHER', recipientId: teacher.teacherId, lineId: teacher.lineId, name: teacher.name, sessions: teacher.classSessions });
        }
      }

      for (const student of studentsWithDirectClasses) {
        if (student.lineId) {
          const key = `student-${student.studentId}`;
          if (!recipientSessions.has(key)) {
            recipientSessions.set(key, { recipientType: 'STUDENT', recipientId: student.studentId, lineId: student.lineId, name: student.name, sessions: [] });
          }
          recipientSessions.get(key)!.sessions.push(...student.classSessions);
        }
      }

      for (const student of studentsWithEnrolledClasses) {
        if (student.lineId) {
          const key = `student-${student.studentId}`;
          if (!recipientSessions.has(key)) {
            recipientSessions.set(key, { recipientType: 'STUDENT', recipientId: student.studentId, lineId: student.lineId, name: student.name, sessions: [] });
          }
          for (const enrollment of student.studentClassEnrollments) {
            recipientSessions.get(key)!.sessions.push(enrollment.classSession);
          }
        }
      }

      const totalSessions = recipientSessions.size > 0 ? Array.from(recipientSessions.values()).reduce((sum, recipient) => sum + recipient.sessions.length, 0) : 0;
      console.log(`\n📅 Found ${totalSessions} sessions for date ${targetDateString} across ${recipientSessions.size} recipients`);
      if (recipientSessions.size === 0) {
        console.log('  ⚠️ No recipients with sessions found - skipping this template');
        continue;
      }

      for (const [, recipient] of recipientSessions) {
        try {
          const itemTemplate = template.classListItemTemplate || DEFAULT_CLASS_LIST_ITEM_TEMPLATE;
          const summaryTemplate = template.classListSummaryTemplate || DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE;
          let dailyClassList = '';
          recipient.sessions.forEach((session, index) => {
            const startTime = formatInTimeZone(new Date(session.startTime), TIMEZONE, 'HH:mm');
            const endTime = formatInTimeZone(new Date(session.endTime), TIMEZONE, 'HH:mm');
            const durationMinutes = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
            const duration = `${durationMinutes}分`;
            const studentNames = [ ...(session.student ? [session.student.name] : []), ...(session.studentClassEnrollments?.map((e: any) => e.student.name) || []) ];
            const classType = studentNames.length <= 1 ? '1対1' : 'グループ';
            const classItemVariables = { classNumber: String(index + 1), subjectName: session.subject?.name || '授業', startTime, endTime, teacherName: session.teacher?.name || '未定', boothName: session.booth?.name || '未定', duration, studentName: studentNames[0] || '未定', studentNames: studentNames.join('、') || '未定', studentCount: String(studentNames.length), classType };
            dailyClassList += replaceTemplateVariables(itemTemplate, classItemVariables) + (index < recipient.sessions.length - 1 ? '\n\n' : '');
          });

          if (summaryTemplate && recipient.sessions.length > 0) {
            const firstSession = recipient.sessions[0];
            const lastSession = recipient.sessions[recipient.sessions.length - 1];
            const summaryVariables = { classCount: String(recipient.sessions.length), firstClassTime: firstSession ? formatInTimeZone(new Date(firstSession.startTime), TIMEZONE, 'HH:mm') : '', lastClassTime: lastSession ? formatInTimeZone(new Date(lastSession.endTime), TIMEZONE, 'HH:mm') : '' };
            dailyClassList += '\n\n' + replaceTemplateVariables(summaryTemplate, summaryVariables);
          }

          const templateVariables = { dailyClassList, recipientName: recipient.name, recipientType: recipient.recipientType === 'TEACHER' ? '講師' : '生徒', classDate: formatInTimeZone(targetDate, TIMEZONE, 'yyyy年M月d日'), currentDate: formatInTimeZone(nowJST, TIMEZONE, 'yyyy年M月d日'), classCount: String(recipient.sessions.length) };
          const message = replaceTemplateVariables(template.content, templateVariables);
          const notificationType = template.timingValue === 0 ? 'DAILY_SUMMARY_SAMEDAY' : `DAILY_SUMMARY_${template.timingValue}D`;
          
          const scheduledAtJST = startOfDay(nowJST);
          scheduledAtJST.setHours(template.timingHour ?? 9);

          const scheduledAt = skipTimeCheck ? now : fromZonedTime(scheduledAtJST, TIMEZONE);

          console.log(`\n📨 Creating notification for ${recipient.name}`);
          console.log(`  Type: ${recipient.recipientType}`);
          console.log(`  Target date: ${targetDateString}`);
          console.log(`  Scheduled at (UTC): ${format(scheduledAt, 'yyyy-MM-dd HH:mm:ss')}`);
          
          const notification = await createNotification({
            recipientType: recipient.recipientType,
            recipientId: recipient.recipientId,
            notificationType,
            message,
            relatedClassId: recipient.sessions.length > 0 ? recipient.sessions.map(s => s.classId).join(',') : undefined,
            branchId: template.branchId || undefined,
            sentVia: 'LINE',
            scheduledAt,
            targetDate: new Date(targetDateString + 'T00:00:00.000Z'),  // Ensure UTC date format
            skipDuplicateCheck: skipTimeCheck,
          });

          if (notification) {
            console.log(`  ✅ QUEUED: Notification ${notification.notificationId} queued for ${recipient.name}`);
            totalNotificationsSent++;
          }
        } catch (error) {
          const errorMsg = `Error for ${recipient.name}: ${error}`;
          console.error(`  ❌ ERROR: ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Error processing template ${template.name}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log('\n=== NOTIFICATION PROCESSING COMPLETED ===');
  console.log(`Total notifications queued: ${totalNotificationsSent}`);
  console.log(`Templates processed: ${activeTemplates.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log('ℹ️ Notifications will be sent by the worker when scheduled time arrives');
  
  return { notificationsQueued: totalNotificationsSent, templatesProcessed: activeTemplates.length, errors: errors.length > 0 ? errors : undefined, timestamp: formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss zzz') };
}

export async function GET(req: NextRequest) {
  try {
    console.log('📬 Notification SEND cron triggered at:', new Date().toISOString());
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Send cron authentication passed');
    const result = await processNotifications(false);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in notification service:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export const POST = withRole(
  ['ADMIN'],
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const skipTimeCheck = body.skipTimeCheck ?? true;
      console.log('Manual notification trigger requested by admin with skipTimeCheck:', skipTimeCheck);
      const result = await processNotifications(skipTimeCheck);
      return NextResponse.json({ success: true, manual: true, ...result });
    } catch (error) {
      console.error('Error in manual notification trigger:', error);
      return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
  }
);