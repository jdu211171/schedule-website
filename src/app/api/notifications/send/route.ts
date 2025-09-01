import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification/notification-service';
import { addDays, format, startOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { replaceTemplateVariables, DEFAULT_CLASS_LIST_ITEM_TEMPLATE, DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE } from '@/lib/line/message-templates';
import { withRole } from '@/lib/auth';

const TIMEZONE = 'Asia/Tokyo';

// Helper: check if the given date is a vacation for the branch (handles recurring)
async function isVacationDay(branchId: string | undefined, date: Date): Promise<boolean> {
  if (!branchId) return false;
  const vacations = await prisma.vacation.findMany({
    where: { branchId },
    select: { startDate: true, endDate: true, isRecurring: true },
  });
  const md = (d: Date) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const targetMD = md(date);
  for (const v of vacations) {
    if (!v.isRecurring) {
      if (v.startDate <= date && v.endDate >= date) return true;
    } else {
      const startMD = md(v.startDate);
      const endMD = md(v.endDate);
      if (startMD <= endMD) {
        if (targetMD >= startMD && targetMD <= endMD) return true;
      } else {
        if (targetMD >= startMD || targetMD <= endMD) return true;
      }
    }
  }
  return false;
}

async function processNotifications(skipTimeCheck: boolean = false) {
  const now = new Date();
  const nowJST = toZonedTime(now, TIMEZONE);

  console.log('=== NOTIFICATION PROCESSING STARTED ===');
  console.log('Current time (UTC):', now.toISOString());
  console.log('Current time (JST):', formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss zzz'));
  console.log('Skip time check:', skipTimeCheck);
  console.log('Current hour (JST):', nowJST.getHours());
  console.log('Current minute (JST):', nowJST.getMinutes());
  console.log('Environment:', process.env.NODE_ENV || 'development');

  const activeTemplates = await prisma.lineMessageTemplate.findMany({
    where: {
      templateType: 'before_class',
      isActive: true
      // Removed branchId filter to get both global and branch-specific templates
    },
    select: {
      id: true,
      name: true,
      timingType: true,
      timingValue: true,
      timingHour: true,
      timingMinute: true,
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
    const timeStr = `${template.timingHour}:${String(template.timingMinute ?? 0).padStart(2, '0')}`;
    console.log(`  Timing: ${template.timingValue} days before at ${timeStr} JST`);
    console.log(`  Branch: ${template.branchId || 'Global'}`);
  });

  let totalNotificationsSent = 0;
  const errors: string[] = [];

  for (const template of activeTemplates) {
    try {
      // Check if current time is at or past the scheduled time (hours and minutes)
      const currentMinutes = nowJST.getHours() * 60 + nowJST.getMinutes();
      const templateMinutes = template.timingHour * 60 + (template.timingMinute ?? 0);
      const shouldSend = currentMinutes >= templateMinutes;
      
      if (!skipTimeCheck && !shouldSend) {
        const currentTime = `${nowJST.getHours()}:${String(nowJST.getMinutes()).padStart(2, '0')}`;
        const scheduledTime = `${template.timingHour}:${String(template.timingMinute ?? 0).padStart(2, '0')}`;
        console.log(`⏰ Waiting for scheduled time: ${scheduledTime}. Current time: ${currentTime}`);
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
      console.log(`  Target date object (UTC): ${targetDate.toISOString()}`);
      console.log(`  Template ID: ${template.id}`);
      console.log(`  Branch: ${template.branchId || 'Global (all branches)'}`);
      console.log(`  Searching for classes on date: ${format(targetDate, 'yyyy-MM-dd')}`);
      console.log(`  Date range: ${targetDate.toISOString()} to ${new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString()}`);

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
              subject: { select: { name: true } },
              booth: { select: { name: true } },
              branch: { select: { name: true } }
            }
          }
        }
      });

      console.log(`  Found ${teachersWithClasses.length} teachers with classes on ${targetDateString}`);
      
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

      console.log(`  Found ${studentsWithDirectClasses.length} students with direct classes on ${targetDateString}`);
      
      // Removed studentsWithEnrolledClasses query as we no longer support group classes

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

      // Removed processing of studentsWithEnrolledClasses as we no longer support group classes

      const totalSessions = recipientSessions.size > 0 ? Array.from(recipientSessions.values()).reduce((sum, recipient) => sum + recipient.sessions.length, 0) : 0;
      console.log(`\n📅 Found ${totalSessions} sessions for date ${targetDateString} across ${recipientSessions.size} recipients`);
      if (recipientSessions.size === 0) {
        console.log('  ⚠️ No recipients with sessions found - skipping this template');
        continue;
      }

      for (const [, recipient] of recipientSessions) {
        try {
          // Group sessions by branch
          const sessionsByBranch = new Map<string, any[]>();
          
          for (const session of recipient.sessions) {
            const branchId = session.branch?.branchId || 'NO_BRANCH';
            if (!sessionsByBranch.has(branchId)) {
              sessionsByBranch.set(branchId, []);
            }
            sessionsByBranch.get(branchId)!.push(session);
          }
          
          // Create notifications per branch (skip branches on vacation day)
          for (const [branchId, branchSessions] of sessionsByBranch) {
            if (branchId === 'NO_BRANCH' && template.branchId) {
              // Skip sessions without branch for branch-specific templates
              continue;
            }
            
            if (branchId !== 'NO_BRANCH' && template.branchId && template.branchId !== branchId) {
              // Skip sessions from other branches for branch-specific templates
              continue;
            }
            
            // Suppress notifications on vacation days for this branch
            const effectiveBranchId = branchId !== 'NO_BRANCH' ? branchId : (template.branchId || undefined);
            if (await isVacationDay(effectiveBranchId, targetDate)) {
              console.log(`  ⛔ Skipping notifications for branch ${effectiveBranchId} on vacation day ${targetDateString}`);
              continue;
            }

            const itemTemplate = template.classListItemTemplate || DEFAULT_CLASS_LIST_ITEM_TEMPLATE;
            const summaryTemplate = template.classListSummaryTemplate || DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE;
            let dailyClassList = '';
            branchSessions.forEach((session, index) => {
            // Extract time directly from the Date object without timezone conversion
            // The Time(6) fields are already stored in the correct timezone (JST)
            const startDate = new Date(session.startTime);
            const startTime = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;
            const endDate = new Date(session.endTime);
            const endTime = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;
            const durationMinutes = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
            const duration = `${durationMinutes}分`;
            const studentName = session.student?.name || '生徒未設定';
            const teacherName = session.teacher?.name || '講師未設定';

            // Modify the template based on recipient type to avoid showing redundant information
            let recipientSpecificTemplate = itemTemplate;
            if (recipient.recipientType === 'TEACHER') {
              // For teachers, remove their own name from the template
              recipientSpecificTemplate = itemTemplate.replace(/講師: {{teacherName}}\n?/g, '');
            } else if (recipient.recipientType === 'STUDENT') {
              // For students, remove their own name from the template
              recipientSpecificTemplate = itemTemplate.replace(/生徒: {{studentName}}\n?/g, '');
            }

            const classItemVariables = { 
              classNumber: String(index + 1), 
              subjectName: session.subject?.name || '科目未設定', 
              startTime, 
              endTime, 
              teacherName, 
              boothName: session.booth?.name || 'ブース未設定', 
              duration, 
              studentName 
            };
            dailyClassList += replaceTemplateVariables(recipientSpecificTemplate, classItemVariables) + (index < branchSessions.length - 1 ? '\n\n' : '');
          });

          if (summaryTemplate && branchSessions.length > 0) {
            const firstSession = branchSessions[0];
            const lastSession = branchSessions[branchSessions.length - 1];
            // Extract time directly without timezone conversion
            const firstStartDate = new Date(firstSession.startTime);
            const lastEndDate = new Date(lastSession.endTime);
            const summaryVariables = { 
              classCount: String(branchSessions.length), 
              firstClassTime: firstSession ? `${String(firstStartDate.getUTCHours()).padStart(2, '0')}:${String(firstStartDate.getUTCMinutes()).padStart(2, '0')}` : '', 
              lastClassTime: lastSession ? `${String(lastEndDate.getUTCHours()).padStart(2, '0')}:${String(lastEndDate.getUTCMinutes()).padStart(2, '0')}` : '' 
            };
            dailyClassList += '\n\n' + replaceTemplateVariables(summaryTemplate, summaryVariables);
          }

          // Calculate summary variables for the main template
          let firstClassTime = '';
          let lastClassTime = '';
          let totalDuration = '0';
          let branchName = '';
          
          if (branchSessions.length > 0) {
            // Sort sessions by start time to ensure correct first/last
            const sortedSessions = [...branchSessions].sort((a, b) => 
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            
            const firstSession = sortedSessions[0];
            const lastSession = sortedSessions[sortedSessions.length - 1];
            
            // Extract time directly without timezone conversion
            const firstStartDate = new Date(firstSession.startTime);
            const lastEndDate = new Date(lastSession.endTime);
            firstClassTime = `${String(firstStartDate.getUTCHours()).padStart(2, '0')}:${String(firstStartDate.getUTCMinutes()).padStart(2, '0')}`;
            lastClassTime = `${String(lastEndDate.getUTCHours()).padStart(2, '0')}:${String(lastEndDate.getUTCMinutes()).padStart(2, '0')}`;
            
            // Calculate total duration in minutes then convert to hours
            const totalMinutes = sortedSessions.reduce((total, session) => {
              const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
              return total + duration;
            }, 0);
            
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            totalDuration = hours > 0 ? `${hours}時間${minutes > 0 ? minutes + '分' : ''}` : `${minutes}分`;
            
            // Get branch name from sessions
            branchName = sortedSessions[0].branch?.name || '';
          }
          
          const templateVariables = { 
            dailyClassList, 
            recipientName: recipient.name, 
            recipientType: recipient.recipientType === 'TEACHER' ? '講師' : '生徒', 
            classDate: formatInTimeZone(targetDate, TIMEZONE, 'yyyy年M月d日'), 
            currentDate: formatInTimeZone(nowJST, TIMEZONE, 'yyyy年M月d日'), 
            classCount: String(branchSessions.length),
            firstClassTime,
            lastClassTime,
            totalDuration,
            branchName
          };
          const message = replaceTemplateVariables(template.content, templateVariables);
          const notificationType = template.timingValue === 0 ? 'DAILY_SUMMARY_SAMEDAY' : `DAILY_SUMMARY_${template.timingValue}D`;
          
          const scheduledAtJST = startOfDay(nowJST);
          scheduledAtJST.setHours(template.timingHour ?? 9, template.timingMinute ?? 0, 0, 0);

          const scheduledAt = skipTimeCheck ? now : fromZonedTime(scheduledAtJST, TIMEZONE);

          // Use the actual branch ID from sessions, not from template
          const notificationBranchId = branchId !== 'NO_BRANCH' ? branchId : (template.branchId || undefined);

          console.log(`\n📨 Creating notification for ${recipient.name}`);
          console.log(`  Type: ${recipient.recipientType}`);
          console.log(`  Target date: ${targetDateString}`);
          console.log(`  Branch: ${branchName || 'Global'} (ID: ${notificationBranchId || 'none'})`);
          console.log(`  Classes in branch: ${branchSessions.length}`);
          console.log(`  Scheduled at (UTC): ${format(scheduledAt, 'yyyy-MM-dd HH:mm:ss')}`);
          
          const notification = await createNotification({
            recipientType: recipient.recipientType,
            recipientId: recipient.recipientId,
            notificationType,
            message,
            relatedClassId: branchSessions.length > 0 ? branchSessions.map(s => s.classId).join(',') : undefined,
            branchId: notificationBranchId,
            sentVia: 'LINE',
            scheduledAt,
            targetDate: new Date(targetDateString + 'T00:00:00.000Z'),  // Ensure UTC date format
            templateId: template.id,
            skipDuplicateCheck: skipTimeCheck,
          });

          if (notification) {
            console.log(`  ✅ QUEUED: Notification ${notification.notificationId} queued for ${recipient.name}`);
            totalNotificationsSent++;
          }
          } // End of branch loop
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
