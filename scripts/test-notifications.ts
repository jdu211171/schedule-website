import { prisma } from '../src/lib/prisma';
import { format, addHours, addMinutes, subMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Tokyo';

async function testNotificationQuery() {
  try {
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

    console.log('=== Notification Test ===');
    console.log('Current time (JST):', format(nowJST, 'yyyy-MM-dd HH:mm:ss'));
    console.log('\n24 Hour Check:');
    console.log('Target date:', date24h);
    console.log('Time window:', format(target24hStart, 'HH:mm:ss'), '-', format(target24hEnd, 'HH:mm:ss'));
    console.log('\n30 Minute Check:');
    console.log('Target date:', date30m);
    console.log('Time window:', format(target30mStart, 'HH:mm:ss'), '-', format(target30mEnd, 'HH:mm:ss'));

    // Check all sessions for tomorrow
    console.log('\n=== All sessions for tomorrow ===');
    const allTomorrowSessions = await prisma.classSession.findMany({
      where: {
        date: new Date(date24h)
      },
      include: {
        teacher: { select: { name: true, lineId: true } },
        student: { select: { name: true, lineId: true } },
        subject: { select: { name: true } }
      }
    });

    console.log(`Found ${allTomorrowSessions.length} sessions for ${date24h}`);
    allTomorrowSessions.forEach(session => {
      console.log(`- ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'} (Teacher: ${session.teacher?.name}, Student: ${session.student?.name})`);
      console.log(`  Teacher LINE: ${session.teacher?.lineId || 'Not linked'}, Student LINE: ${session.student?.lineId || 'Not linked'}`);
    });

    // Check sessions in the 24h window
    console.log('\n=== Sessions in 24h notification window ===');
    const sessions24h = await prisma.classSession.findMany({
      where: {
        date: new Date(date24h),
        startTime: {
          gte: new Date(`1970-01-01T${format(target24hStart, 'HH:mm:ss')}.000Z`),
          lte: new Date(`1970-01-01T${format(target24hEnd, 'HH:mm:ss')}.000Z`)
        }
      },
      include: {
        teacher: { select: { name: true, lineId: true } },
        student: { select: { name: true, lineId: true } },
        subject: { select: { name: true } }
      }
    });

    console.log(`Found ${sessions24h.length} sessions in 24h window`);
    sessions24h.forEach(session => {
      console.log(`- ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'}`);
    });

    // Check today's sessions
    console.log('\n=== All sessions for today ===');
    const allTodaySessions = await prisma.classSession.findMany({
      where: {
        date: new Date(date30m)
      },
      include: {
        teacher: { select: { name: true, lineId: true } },
        student: { select: { name: true, lineId: true } },
        subject: { select: { name: true } }
      }
    });

    console.log(`Found ${allTodaySessions.length} sessions for ${date30m}`);
    allTodaySessions.forEach(session => {
      console.log(`- ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'} (Teacher: ${session.teacher?.name}, Student: ${session.student?.name})`);
    });

    // Check sessions in the 30m window
    console.log('\n=== Sessions in 30m notification window ===');
    const sessions30m = await prisma.classSession.findMany({
      where: {
        date: new Date(date30m),
        startTime: {
          gte: new Date(`1970-01-01T${format(target30mStart, 'HH:mm:ss')}.000Z`),
          lte: new Date(`1970-01-01T${format(target30mEnd, 'HH:mm:ss')}.000Z`)
        }
      },
      include: {
        teacher: { select: { name: true, lineId: true } },
        student: { select: { name: true, lineId: true } },
        subject: { select: { name: true } }
      }
    });

    console.log(`Found ${sessions30m.length} sessions in 30m window`);
    sessions30m.forEach(session => {
      console.log(`- ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'}`);
    });

    // Check notification history
    console.log('\n=== Recent notifications ===');
    const recentNotifications = await prisma.notification.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${recentNotifications.length} notifications in the last 24 hours`);
    recentNotifications.forEach(notif => {
      console.log(`- ${format(notif.createdAt, 'yyyy-MM-dd HH:mm:ss')} - ${notif.notificationType} - ${notif.status}`);
    });

    // Check teachers and students with LINE IDs
    console.log('\n=== LINE Integration Status ===');
    const [teachersWithLine, studentsWithLine, totalTeachers, totalStudents] = await Promise.all([
      prisma.teacher.count({ where: { lineId: { not: null } } }),
      prisma.student.count({ where: { lineId: { not: null } } }),
      prisma.teacher.count(),
      prisma.student.count()
    ]);

    console.log(`Teachers with LINE: ${teachersWithLine}/${totalTeachers}`);
    console.log(`Students with LINE: ${studentsWithLine}/${totalStudents}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationQuery();