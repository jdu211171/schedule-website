import { prisma } from '../src/lib/prisma';
import { addHours, addMinutes, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Tokyo';

async function createTestSession() {
  try {
    const now = new Date();
    const nowJST = toZonedTime(now, TIMEZONE);
    
    // Create a session for 30 minutes from now (for 30m notification test)
    const session30m = addMinutes(nowJST, 30);
    const date30m = format(nowJST, 'yyyy-MM-dd');
    
    // Create a session for 24 hours from now (for 24h notification test)
    const session24h = addHours(nowJST, 24);
    const date24h = format(session24h, 'yyyy-MM-dd');

    // Get a teacher and student with LINE IDs
    const teacher = await prisma.teacher.findFirst({
      where: { lineId: { not: null } }
    });
    
    const student = await prisma.student.findFirst({
      where: { lineId: { not: null } }
    });

    const subject = await prisma.subject.findFirst();
    const classType = await prisma.classType.findFirst();
    const booth = await prisma.booth.findFirst();
    const branch = await prisma.branch.findFirst();

    if (!teacher || !student || !subject || !classType || !booth || !branch) {
      console.error('Missing required data');
      return;
    }

    console.log('Creating test sessions...');
    console.log(`Teacher: ${teacher.name} (LINE: ${teacher.lineId})`);
    console.log(`Student: ${student.name} (LINE: ${student.lineId})`);

    // Create session for 30 minutes from now
    const startTime30m = session30m;
    const endTime30m = addMinutes(startTime30m, 60);
    
    const createdSession30m = await prisma.classSession.create({
      data: {
        teacherId: teacher.teacherId,
        studentId: student.studentId,
        subjectId: subject.subjectId,
        classTypeId: classType.classTypeId,
        boothId: booth.boothId,
        branchId: branch.branchId,
        date: new Date(date30m),
        startTime: new Date(`1970-01-01T${format(startTime30m, 'HH:mm:ss')}.000Z`),
        endTime: new Date(`1970-01-01T${format(endTime30m, 'HH:mm:ss')}.000Z`),
        duration: 60,
        notes: 'Test session for 30m notification'
      }
    });

    console.log(`\nCreated session for 30m notification:`);
    console.log(`- Date: ${date30m}`);
    console.log(`- Time: ${format(startTime30m, 'HH:mm')} - ${format(endTime30m, 'HH:mm')}`);
    console.log(`- Should trigger notification around: ${format(nowJST, 'HH:mm')}`);

    // Create session for 24 hours from now
    const startTime24h = session24h;
    const endTime24h = addMinutes(startTime24h, 90);
    
    const createdSession24h = await prisma.classSession.create({
      data: {
        teacherId: teacher.teacherId,
        studentId: student.studentId,
        subjectId: subject.subjectId,
        classTypeId: classType.classTypeId,
        boothId: booth.boothId,
        branchId: branch.branchId,
        date: new Date(date24h),
        startTime: new Date(`1970-01-01T${format(startTime24h, 'HH:mm:ss')}.000Z`),
        endTime: new Date(`1970-01-01T${format(endTime24h, 'HH:mm:ss')}.000Z`),
        duration: 90,
        notes: 'Test session for 24h notification'
      }
    });

    console.log(`\nCreated session for 24h notification:`);
    console.log(`- Date: ${date24h}`);
    console.log(`- Time: ${format(startTime24h, 'HH:mm')} - ${format(endTime24h, 'HH:mm')}`);
    console.log(`- Should trigger notification around: ${format(nowJST, 'HH:mm')}`);

    console.log('\nTest sessions created successfully!');
    console.log('The cron job runs every 5 minutes, so notifications should be sent within the next 5 minutes.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSession();