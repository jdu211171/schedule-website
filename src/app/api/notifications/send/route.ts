import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineMulticast } from '@/lib/line';
import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { replaceTemplateVariables } from '@/lib/line/message-templates';

const TIMEZONE = 'Asia/Tokyo';

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const nowJST = toZonedTime(now, TIMEZONE);

    // Log for debugging
    console.log('Notification check at:', format(nowJST, 'yyyy-MM-dd HH:mm:ss'));
    console.log('LINE_CHANNEL_ACCESS_TOKEN present:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
    console.log('CRON_SECRET present:', !!process.env.CRON_SECRET);

    // Get all active LINE message templates
    const activeTemplates = await prisma.lineMessageTemplate.findMany({
      where: {
        templateType: 'before_class',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        timingType: true,
        timingValue: true,
        timingHour: true,
        branchId: true,
        content: true,
        branch: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${activeTemplates.length} active templates`);

    let totalNotificationsSent = 0;
    const errors: string[] = [];
    const processedRecipients = new Set<string>(); // Prevent duplicate notifications

    // Process each template
    for (const template of activeTemplates) {
      try {
        // Check if we're in the correct time window for this template
        const currentHour = nowJST.getHours();
        const currentMinute = nowJST.getMinutes();
        const targetHour = template.timingHour ?? 9;
        
        // Only process if we're within a 10-minute window of the target hour
        if (currentHour !== targetHour || currentMinute > 10) {
          console.log(`Skipping template ${template.name} - not in time window (current: ${currentHour}:${currentMinute}, target: ${targetHour}:00-${targetHour}:10)`);
          continue;
        }
        
        // Calculate target date for notifications
        const targetDate = format(addDays(nowJST, template.timingValue), 'yyyy-MM-dd');
        
        console.log(`\nProcessing template: ${template.name} (${template.timingValue} days before)`);
        console.log(`Target date for classes: ${targetDate}`);

        // Find ALL sessions for the target date (not just specific time window)
        const whereClause = {
          date: new Date(targetDate + 'T00:00:00.000Z'), // All classes on target date
          ...(template.branchId && { branchId: template.branchId })
        };

        const sessions = await prisma.classSession.findMany({
          where: whereClause,
          orderBy: {
            startTime: 'asc' // Sort by start time for better display
          },
          include: {
            teacher: {
              select: {
                teacherId: true,
                name: true,
                lineId: true,
                lineNotificationsEnabled: true
              }
            },
            student: {
              select: {
                studentId: true,
                name: true,
                lineId: true,
                lineNotificationsEnabled: true
              }
            },
            studentClassEnrollments: {
              include: {
                student: {
                  select: {
                    studentId: true,
                    name: true,
                    lineId: true,
                    lineNotificationsEnabled: true
                  }
                }
              }
            },
            subject: {
              select: {
                name: true
              }
            },
            booth: {
              select: {
                name: true
              }
            },
            branch: {
              select: {
                name: true
              }
            }
          }
        });

        console.log(`Found ${sessions.length} sessions for date ${targetDate}`);

        // Group sessions by recipient (teacher or student)
        const recipientSessions = new Map<string, {
          recipientType: 'TEACHER' | 'STUDENT';
          recipientId: string;
          lineId: string;
          name: string;
          sessions: typeof sessions;
        }>();

        // Process all sessions and group by recipient
        for (const session of sessions) {
          // Add for teacher
          if (session.teacher?.lineId && (session.teacher.lineNotificationsEnabled ?? true)) {
            const key = `teacher-${session.teacher.teacherId}`;
            if (!recipientSessions.has(key)) {
              recipientSessions.set(key, {
                recipientType: 'TEACHER',
                recipientId: session.teacher.teacherId,
                lineId: session.teacher.lineId,
                name: session.teacher.name,
                sessions: []
              });
            }
            recipientSessions.get(key)!.sessions.push(session);
          }

          // Add for direct student (one-on-one sessions)
          if (session.student?.lineId && (session.student.lineNotificationsEnabled ?? true)) {
            const key = `student-${session.student.studentId}`;
            if (!recipientSessions.has(key)) {
              recipientSessions.set(key, {
                recipientType: 'STUDENT',
                recipientId: session.student.studentId,
                lineId: session.student.lineId,
                name: session.student.name,
                sessions: []
              });
            }
            recipientSessions.get(key)!.sessions.push(session);
          }

          // Add for enrolled students (group sessions)
          for (const enrollment of session.studentClassEnrollments) {
            if (enrollment.student.lineId && (enrollment.student.lineNotificationsEnabled ?? true)) {
              const key = `student-${enrollment.student.studentId}`;
              if (!recipientSessions.has(key)) {
                recipientSessions.set(key, {
                  recipientType: 'STUDENT',
                  recipientId: enrollment.student.studentId,
                  lineId: enrollment.student.lineId,
                  name: enrollment.student.name,
                  sessions: []
                });
              }
              recipientSessions.get(key)!.sessions.push(session);
            }
          }
        }

        // Send one notification per recipient with all their classes
        for (const [, recipient] of recipientSessions) {
          // Check if we've already sent a notification to this recipient today
          const recipientKey = `${recipient.recipientType}-${recipient.recipientId}-${targetDate}`;
          if (processedRecipients.has(recipientKey)) {
            console.log(`Skipping duplicate notification for ${recipient.name}`);
            continue;
          }
          processedRecipients.add(recipientKey);
          
          try {
            // Build the daily class list
            let dailyClassList = '';
            recipient.sessions.forEach((session, index) => {
              const startTime = format(new Date(session.startTime), 'HH:mm');
              const endTime = format(new Date(session.endTime), 'HH:mm');
              
              dailyClassList += `【${index + 1}】${session.subject?.name || '授業'}\n`;
              dailyClassList += `時間: ${startTime} - ${endTime}\n`;
              if (session.teacher?.name) {
                dailyClassList += `講師: ${session.teacher.name}\n`;
              }
              if (session.booth?.name) {
                dailyClassList += `場所: ${session.booth.name}\n`;
              }
              if (index < recipient.sessions.length - 1) {
                dailyClassList += '\n';
              }
            });
            
            // Add summary at the end
            dailyClassList += `\n\n計${recipient.sessions.length}件の授業があります。`;
            
            // Calculate additional variables
            const firstSession = recipient.sessions[0];
            const lastSession = recipient.sessions[recipient.sessions.length - 1];
            const firstClassTime = firstSession ? format(new Date(firstSession.startTime), 'HH:mm') : '';
            const lastClassTime = lastSession ? format(new Date(lastSession.endTime), 'HH:mm') : '';
            
            // Calculate total duration in hours
            let totalMinutes = 0;
            recipient.sessions.forEach(session => {
              const start = new Date(session.startTime);
              const end = new Date(session.endTime);
              totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
            });
            const totalHours = totalMinutes / 60;
            const totalDuration = totalHours % 1 === 0 ? `${totalHours}時間` : `${totalHours.toFixed(1)}時間`;
            
            // Extract unique teacher names
            const teacherNames = [...new Set(recipient.sessions
              .map(s => s.teacher?.name)
              .filter(Boolean)
            )].join('、');
            
            // Extract unique subject names
            const subjectNames = [...new Set(recipient.sessions
              .map(s => s.subject?.name)
              .filter(Boolean)
            )].join('、');
            
            // Prepare variables for template replacement
            const templateVariables: Record<string, string> = {
              dailyClassList,
              recipientName: recipient.name,
              recipientType: recipient.recipientType === 'TEACHER' ? '講師' : '生徒',
              classDate: format(new Date(targetDate), 'yyyy年M月d日'),
              currentDate: format(nowJST, 'yyyy年M月d日'),
              classCount: String(recipient.sessions.length),
              firstClassTime,
              lastClassTime,
              totalDuration,
              teacherNames: teacherNames || '未定',
              subjectNames: subjectNames || '未定',
              branchName: template.branch?.name || ''
            };
            
            // Replace variables in template content
            const message = replaceTemplateVariables(template.content, templateVariables);

            await sendLineMulticast([recipient.lineId], message);
            totalNotificationsSent++;

            // Log notification in database
            await prisma.notification.create({
              data: {
                recipientType: recipient.recipientType,
                recipientId: recipient.recipientId,
                notificationType: template.timingValue === 0 ? 'DAILY_SUMMARY_SAMEDAY' : 
                                 template.timingValue === 1 ? 'DAILY_SUMMARY_24H' : 
                                 `DAILY_SUMMARY_${template.timingValue}D`,
                message,
                relatedClassId: recipient.sessions.map(s => s.classId).join(','), // Store all class IDs
                branchId: template.branchId,
                sentVia: 'LINE',
                sentAt: now,
                status: 'SENT'
              }
            });

            console.log(`✓ Sent daily summary to ${recipient.name} (${recipient.recipientType}) with ${recipient.sessions.length} classes`);
          } catch (error) {
            const errorMsg = `Error sending daily summary to ${recipient.name}: ${error}`;
            console.error(errorMsg);
            if (error instanceof Error && 'response' in error) {
              console.error('LINE API Response:', (error as Error & { response?: { data?: unknown } }).response?.data);
            }
            errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing template ${template.name}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: totalNotificationsSent,
      templatesProcessed: activeTemplates.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: format(nowJST, 'yyyy-MM-dd HH:mm:ss zzz')
    });
  } catch (error) {
    console.error('Error in notification service:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}