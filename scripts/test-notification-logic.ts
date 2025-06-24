import { format, addHours, addMinutes, subMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { prisma } from '../src/lib/prisma';

const TIMEZONE = 'Asia/Tokyo';

async function testNotificationLogic() {
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

  console.log('=== Notification Time Debug ===');
  console.log('Current time JST:', format(nowJST, 'yyyy-MM-dd HH:mm:ss'));
  console.log('');
  console.log('24h notification:');
  console.log('  Target date:', date24h);
  console.log('  Target time:', format(target24h, 'HH:mm:ss'));
  console.log('  Window:', format(target24hStart, 'HH:mm:ss'), '-', format(target24hEnd, 'HH:mm:ss'));
  console.log('  Time objects:');
  console.log('    Start:', new Date(`1970-01-01T${format(target24hStart, 'HH:mm:ss')}`));
  console.log('    End:', new Date(`1970-01-01T${format(target24hEnd, 'HH:mm:ss')}`));
  console.log('');
  console.log('30m notification:');
  console.log('  Target date:', date30m);
  console.log('  Target time:', format(target30m, 'HH:mm:ss'));
  console.log('  Window:', format(target30mStart, 'HH:mm:ss'), '-', format(target30mEnd, 'HH:mm:ss'));
  console.log('');

  // Test query for 24h sessions
  console.log('=== Testing 24h Query ===');
  try {
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
      select: {
        classId: true,
        date: true,
        startTime: true,
        teacher: {
          select: {
            name: true,
            lineId: true
          }
        },
        student: {
          select: {
            name: true,
            lineId: true
          }
        },
        subject: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${sessions24h.length} sessions for 24h notification`);
    sessions24h.forEach(session => {
      console.log(`  - ${format(session.date, 'yyyy-MM-dd')} ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'}`);
      console.log(`    Teacher: ${session.teacher?.name || 'None'} (LINE ID: ${session.teacher?.lineId || 'None'})`);
      console.log(`    Student: ${session.student?.name || 'None'} (LINE ID: ${session.student?.lineId || 'None'})`);
    });
  } catch (error) {
    console.error('Error querying 24h sessions:', error);
  }

  // Test query for 30m sessions
  console.log('');
  console.log('=== Testing 30m Query ===');
  try {
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
      select: {
        classId: true,
        date: true,
        startTime: true,
        teacher: {
          select: {
            name: true,
            lineId: true
          }
        },
        student: {
          select: {
            name: true,
            lineId: true
          }
        },
        subject: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${sessions30m.length} sessions for 30m notification`);
    sessions30m.forEach(session => {
      console.log(`  - ${format(session.date, 'yyyy-MM-dd')} ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'}`);
      console.log(`    Teacher: ${session.teacher?.name || 'None'} (LINE ID: ${session.teacher?.lineId || 'None'})`);
      console.log(`    Student: ${session.student?.name || 'None'} (LINE ID: ${session.student?.lineId || 'None'})`);
    });
  } catch (error) {
    console.error('Error querying 30m sessions:', error);
  }

  // Show upcoming sessions for debugging
  console.log('');
  console.log('=== Upcoming Sessions (next 2 days) ===');
  try {
    const upcomingSessions = await prisma.classSession.findMany({
      where: {
        date: {
          gte: new Date(format(nowJST, 'yyyy-MM-dd')),
          lte: new Date(format(addHours(nowJST, 48), 'yyyy-MM-dd'))
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      select: {
        classId: true,
        date: true,
        startTime: true,
        teacher: {
          select: {
            name: true,
            lineId: true
          }
        },
        student: {
          select: {
            name: true,
            lineId: true
          }
        },
        subject: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });

    console.log(`Found ${upcomingSessions.length} upcoming sessions`);
    upcomingSessions.forEach(session => {
      console.log(`  - ${format(session.date, 'yyyy-MM-dd')} ${format(session.startTime, 'HH:mm')} - ${session.subject?.name || 'No subject'}`);
      console.log(`    Teacher: ${session.teacher?.name || 'None'} (LINE ID: ${session.teacher?.lineId || 'None'})`);
      console.log(`    Student: ${session.student?.name || 'None'} (LINE ID: ${session.student?.lineId || 'None'})`);
    });
  } catch (error) {
    console.error('Error querying upcoming sessions:', error);
  }

  await prisma.$disconnect();
}

testNotificationLogic().catch(console.error);