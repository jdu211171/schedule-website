import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineMulticast } from '@/lib/line';
import { formatClassNotificationWithTemplate, type ClassSessionData } from '@/lib/line/format-notification';
import { addHours, addMinutes, addDays, subMinutes, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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
        branchId: true
      }
    });

    console.log(`Found ${activeTemplates.length} active templates`);

    let totalNotificationsSent = 0;
    const errors: string[] = [];
    const processedSessions = new Set<string>(); // Prevent duplicate notifications

    // Process each template
    for (const template of activeTemplates) {
      try {
        // Calculate target time based on template timing
        let targetTime: Date;
        let minutesBeforeClass: number;

        switch (template.timingType) {
          case 'minutes':
            targetTime = addMinutes(nowJST, template.timingValue);
            minutesBeforeClass = template.timingValue;
            break;
          case 'hours':
            targetTime = addHours(nowJST, template.timingValue);
            minutesBeforeClass = template.timingValue * 60;
            break;
          case 'days':
            targetTime = addDays(nowJST, template.timingValue);
            minutesBeforeClass = template.timingValue * 1440;
            
            // If timingHour is specified, set the exact hour
            if (template.timingHour !== null && template.timingHour !== undefined) {
              targetTime.setHours(template.timingHour, 0, 0, 0);
            }
            break;
          default:
            console.error(`Unknown timing type: ${template.timingType} for template ${template.name}`);
            continue;
        }

        // Create a ±5 minute window
        const targetStart = subMinutes(targetTime, 5);
        const targetEnd = addMinutes(targetTime, 5);
        const targetDate = format(targetTime, 'yyyy-MM-dd');

        console.log(`\nChecking template: ${template.name} (${template.timingValue} ${template.timingType} before)`);
        console.log(`Target window: ${format(targetStart, 'HH:mm:ss')} - ${format(targetEnd, 'HH:mm:ss')} on ${targetDate}`);

        // Find sessions matching this template's timing
        // IMPORTANT: The database stores time values without timezone info
        // These times represent JST times, so we need to compare them correctly
        // Using 1970-01-01 as the date portion ensures consistent time comparison
        const whereClause: any = {
          date: new Date(targetDate + 'T00:00:00.000Z'), // Ensure UTC date
          startTime: {
            gte: new Date(`1970-01-01T${format(targetStart, 'HH:mm:ss')}.000Z`),
            lte: new Date(`1970-01-01T${format(targetEnd, 'HH:mm:ss')}.000Z`)
          }
        };

        // If template is branch-specific, filter by branch
        if (template.branchId) {
          whereClause.branchId = template.branchId;
        }

        const sessions = await prisma.classSession.findMany({
          where: whereClause,
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

        console.log(`Found ${sessions.length} sessions for this timing`);

        // Send notifications for each session
        for (const session of sessions) {
          // Skip if we've already processed this session
          const sessionKey = `${session.classId}-${minutesBeforeClass}`;
          if (processedSessions.has(sessionKey)) {
            continue;
          }
          processedSessions.add(sessionKey);

          try {
            const lineIds: string[] = [];

            // Add teacher's LINE ID
            if (session.teacher?.lineId && (session.teacher.lineNotificationsEnabled ?? true)) {
              lineIds.push(session.teacher.lineId);
            }

            // Add direct student's LINE ID (for one-on-one sessions)
            if (session.student?.lineId && (session.student.lineNotificationsEnabled ?? true)) {
              lineIds.push(session.student.lineId);
            }

            // Add enrolled students' LINE IDs (for group sessions)
            for (const enrollment of session.studentClassEnrollments) {
              if (enrollment.student.lineId && (enrollment.student.lineNotificationsEnabled ?? true)) {
                lineIds.push(enrollment.student.lineId);
              }
            }

            if (lineIds.length > 0) {
              const sessionData: ClassSessionData = {
                subjectName: session.subject?.name || '授業',
                startTime: session.startTime,
                endTime: session.endTime,
                teacherName: session.teacher?.name,
                studentName: session.student?.name,
                boothName: session.booth?.name,
                branchName: session.branch?.name,
                branchId: session.branchId || undefined
              };

              const message = await formatClassNotificationWithTemplate(sessionData, minutesBeforeClass, session.branchId || undefined);

              await sendLineMulticast(lineIds, message);
              totalNotificationsSent += lineIds.length;

              // Log notification in database
              await prisma.notification.createMany({
                data: lineIds.map(lineId => ({
                  recipientType: lineId === session.teacher?.lineId ? 'TEACHER' : 'STUDENT',
                  recipientId: lineId === session.teacher?.lineId ? session.teacher.teacherId :
                               session.student?.lineId === lineId ? session.student.studentId :
                               session.studentClassEnrollments.find(e => e.student.lineId === lineId)?.student.studentId || '',
                  notificationType: minutesBeforeClass >= 1440 ? 'CLASS_REMINDER_24H' : 
                                   minutesBeforeClass >= 60 ? 'CLASS_REMINDER_1H' : 'CLASS_REMINDER_30M',
                  message,
                  relatedClassId: session.classId,
                  branchId: session.branchId,
                  sentVia: 'LINE',
                  sentAt: now,
                  status: 'SENT'
                }))
              });

              console.log(`✓ Sent notifications to ${lineIds.length} recipients for session ${session.classId}`);
            }
          } catch (error) {
            const errorMsg = `Error sending notification for session ${session.classId} with template ${template.name}: ${error}`;
            console.error(errorMsg);
            if (error instanceof Error && 'response' in error) {
              console.error('LINE API Response:', (error as any).response?.data);
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