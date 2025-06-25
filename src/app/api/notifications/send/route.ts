import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineMulticast, formatClassNotification } from '@/lib/line';
import { addHours, addMinutes, subMinutes, format } from 'date-fns';
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

    // Calculate target times with ±5 minute windows
    const target24h = addHours(nowJST, 24);
    const target24hStart = subMinutes(target24h, 5);
    const target24hEnd = addMinutes(target24h, 5);

    const target30m = addMinutes(nowJST, 30);
    const target30mStart = subMinutes(target30m, 5);
    const target30mEnd = addMinutes(target30m, 5);

    // Format dates for querying
    const date24h = format(target24h, 'yyyy-MM-dd');
    const date30m = format(nowJST, 'yyyy-MM-dd');

    // Log for debugging
    console.log('Notification check at:', format(nowJST, 'yyyy-MM-dd HH:mm:ss'));
    console.log('24h target date:', date24h);
    console.log('24h window:', format(target24hStart, 'HH:mm:ss'), '-', format(target24hEnd, 'HH:mm:ss'));
    console.log('30m target date:', date30m);
    console.log('30m window:', format(target30mStart, 'HH:mm:ss'), '-', format(target30mEnd, 'HH:mm:ss'));
    console.log('LINE_CHANNEL_ACCESS_TOKEN present:', !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
    console.log('CRON_SECRET present:', !!process.env.CRON_SECRET);

    // Find sessions starting in ~24 hours
    const sessions24h = await prisma.classSession.findMany({
      where: {
        date: new Date(date24h),
        AND: [
          {
            startTime: {
              gte: new Date(`1970-01-01T${format(target24hStart, 'HH:mm:ss')}`)
            }
          },
          {
            startTime: {
              lte: new Date(`1970-01-01T${format(target24hEnd, 'HH:mm:ss')}`)
            }
          }
        ]
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
        }
      }
    });

    // Find sessions starting in ~30 minutes
    const sessions30m = await prisma.classSession.findMany({
      where: {
        date: new Date(date30m),
        AND: [
          {
            startTime: {
              gte: new Date(`1970-01-01T${format(target30mStart, 'HH:mm:ss')}`)
            }
          },
          {
            startTime: {
              lte: new Date(`1970-01-01T${format(target30mEnd, 'HH:mm:ss')}`)
            }
          }
        ]
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
        }
      }
    });

    let notificationsSent = 0;
    const errors: string[] = [];

    // Send 24-hour notifications
    for (const session of sessions24h) {
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
          const subjectName = session.subject?.name || '授業';
          const startTime = format(session.startTime, 'HH:mm');
          const message = formatClassNotification('24h', subjectName, startTime, date24h);

          await sendLineMulticast(lineIds, message);
          notificationsSent += lineIds.length;

          // Log notification in database
          await prisma.notification.createMany({
            data: lineIds.map(lineId => ({
              recipientType: lineId === session.teacher?.lineId ? 'TEACHER' : 'STUDENT',
              recipientId: lineId === session.teacher?.lineId ? session.teacher.teacherId :
                           session.student?.lineId === lineId ? session.student.studentId :
                           session.studentClassEnrollments.find(e => e.student.lineId === lineId)?.student.studentId || '',
              notificationType: 'CLASS_REMINDER_24H',
              message,
              relatedClassId: session.classId,
              branchId: session.branchId,
              sentVia: 'LINE',
              sentAt: now,
              status: 'SENT'
            }))
          });
        }
      } catch (error) {
        const errorMsg = `Error sending 24h notification for session ${session.classId}: ${error}`;
        console.error(errorMsg);
        if (error instanceof Error && 'response' in error) {
          console.error('LINE API Response:', (error as any).response?.data);
        }
        errors.push(errorMsg);
      }
    }

    // Send 30-minute notifications
    for (const session of sessions30m) {
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
          const subjectName = session.subject?.name || '授業';
          const startTime = format(session.startTime, 'HH:mm');
          const message = formatClassNotification('30m', subjectName, startTime);

          await sendLineMulticast(lineIds, message);
          notificationsSent += lineIds.length;

          // Log notification in database
          await prisma.notification.createMany({
            data: lineIds.map(lineId => ({
              recipientType: lineId === session.teacher?.lineId ? 'TEACHER' : 'STUDENT',
              recipientId: lineId === session.teacher?.lineId ? session.teacher.teacherId :
                           session.student?.lineId === lineId ? session.student.studentId :
                           session.studentClassEnrollments.find(e => e.student.lineId === lineId)?.student.studentId || '',
              notificationType: 'CLASS_REMINDER_30M',
              message,
              relatedClassId: session.classId,
              branchId: session.branchId,
              sentVia: 'LINE',
              sentAt: now,
              status: 'SENT'
            }))
          });
        }
      } catch (error) {
        const errorMsg = `Error sending 30m notification for session ${session.classId}: ${error}`;
        console.error(errorMsg);
        if (error instanceof Error && 'response' in error) {
          console.error('LINE API Response:', (error as any).response?.data);
        }
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      sessions24h: sessions24h.length,
      sessions30m: sessions30m.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: format(nowJST, 'yyyy-MM-dd HH:mm:ss zzz'),
      debug: {
        date24h,
        date30m,
        target24hWindow: `${format(target24hStart, 'HH:mm:ss')} - ${format(target24hEnd, 'HH:mm:ss')}`,
        target30mWindow: `${format(target30mStart, 'HH:mm:ss')} - ${format(target30mEnd, 'HH:mm:ss')}`
      }
    });
  } catch (error) {
    console.error('Error in notification service:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
