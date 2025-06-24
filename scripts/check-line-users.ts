import { prisma } from '../src/lib/prisma';

async function checkLineUsers() {
  try {
    // Check teachers with LINE IDs
    const teachers = await prisma.teacher.findMany({
      where: { lineId: { not: null } },
      select: {
        teacherId: true,
        name: true,
        lineId: true,
        user: {
          select: {
            username: true
          }
        }
      }
    });

    console.log('=== Teachers with LINE IDs ===');
    teachers.forEach(teacher => {
      console.log(`- ${teacher.name} (${teacher.user?.username})`);
      console.log(`  LINE ID: ${teacher.lineId}`);
      console.log(`  Valid LINE ID format: ${teacher.lineId?.match(/^U[0-9a-f]{32}$/) ? 'Yes' : 'No'}`);
    });

    // Check students with LINE IDs
    const students = await prisma.student.findMany({
      where: { lineId: { not: null } },
      select: {
        studentId: true,
        name: true,
        lineId: true,
        user: {
          select: {
            username: true
          }
        }
      }
    });

    console.log('\n=== Students with LINE IDs ===');
    students.forEach(student => {
      console.log(`- ${student.name} (${student.user?.username})`);
      console.log(`  LINE ID: ${student.lineId}`);
      console.log(`  Valid LINE ID format: ${student.lineId?.match(/^U[0-9a-f]{32}$/) ? 'Yes' : 'No'}`);
    });

    // Check for any unlinked teachers/students
    const unlinkedTeachers = await prisma.teacher.count({
      where: { lineId: null }
    });
    const unlinkedStudents = await prisma.student.count({
      where: { lineId: null }
    });

    console.log(`\nUnlinked teachers: ${unlinkedTeachers}`);
    console.log(`Unlinked students: ${unlinkedStudents}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLineUsers();