import { prisma } from '../src/lib/prisma';
import { format } from 'date-fns';

async function checkSessions() {
  try {
    // Count total sessions
    const totalSessions = await prisma.classSession.count();
    console.log(`Total class sessions in database: ${totalSessions}`);

    // Get some sample sessions
    const sampleSessions = await prisma.classSession.findMany({
      take: 10,
      orderBy: {
        date: 'desc'
      },
      include: {
        teacher: { select: { name: true, lineId: true } },
        student: { select: { name: true, lineId: true } },
        subject: { select: { name: true } },
        branch: { select: { name: true } }
      }
    });

    console.log('\nSample sessions:');
    sampleSessions.forEach(session => {
      console.log(`\n- Date: ${format(session.date, 'yyyy-MM-dd')}`);
      console.log(`  Time: ${format(session.startTime, 'HH:mm')} - ${format(session.endTime, 'HH:mm')}`);
      console.log(`  Subject: ${session.subject?.name || 'N/A'}`);
      console.log(`  Teacher: ${session.teacher?.name || 'N/A'} (LINE: ${session.teacher?.lineId ? 'Linked' : 'Not linked'})`);
      console.log(`  Student: ${session.student?.name || 'N/A'} (LINE: ${session.student?.lineId ? 'Linked' : 'Not linked'})`);
      console.log(`  Branch: ${session.branch?.name || 'N/A'}`);
    });

    // Check for future sessions
    const futureSessions = await prisma.classSession.count({
      where: {
        date: {
          gte: new Date()
        }
      }
    });
    console.log(`\nFuture sessions: ${futureSessions}`);

    // Check sessions for next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextWeekSessions = await prisma.classSession.findMany({
      where: {
        date: {
          gte: new Date(),
          lte: nextWeek
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        teacher: { select: { name: true, lineId: true } },
        student: { select: { name: true, lineId: true } },
        subject: { select: { name: true } }
      }
    });

    console.log(`\nSessions in next 7 days: ${nextWeekSessions.length}`);
    nextWeekSessions.forEach(session => {
      console.log(`- ${format(session.date, 'yyyy-MM-dd')} ${format(session.startTime, 'HH:mm')} - ${session.subject?.name}`);
      console.log(`  Teacher LINE: ${session.teacher?.lineId ? 'Yes' : 'No'}, Student LINE: ${session.student?.lineId ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();