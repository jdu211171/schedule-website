import prisma from '@/lib/prisma';

async function seed() {
    try {
        // **Subject Types**
        const subjectTypes = [
            {
                subjectTypeId: 'MATH',
                name: 'Mathematics',
            },
            {
                subjectTypeId: 'ENG',
                name: 'English',
            },
            {
                subjectTypeId: 'SCI',
                name: 'Science',
            },
            {
                subjectTypeId: 'HIST',
                name: 'History',
            },
            {
                subjectTypeId: 'ART',
                name: 'Art',
            },
        ];
        for (const st of subjectTypes) {
            await prisma.subjectType.upsert({
                where: { subjectTypeId: st.subjectTypeId },
                update: st,
                create: st,
            });
        }

        // **Grades**
        const grades = [
            {
                gradeId: 'ELEM6',
                name: 'Elementary 6',
            },
            {
                gradeId: 'JH3',
                name: 'Junior High 3',
            },
            {
                gradeId: 'HS2',
                name: 'High School 2',
            },
            {
                gradeId: 'HS4',
                name: 'High School 4',
            },
            {
                gradeId: 'ELEM4',
                name: 'Elementary 4',
            },
        ];
        for (const g of grades) {
            await prisma.grade.upsert({
                where: { gradeId: g.gradeId },
                update: g,
                create: g,
            });
        }

        // **Evaluations**
        const evaluations = [
            {
                evaluationId: 'EXCELLENT',
                name: 'Excellent',
            },
            {
                evaluationId: 'GOOD',
                name: 'Good',
            },
            {
                evaluationId: 'AVERAGE',
                name: 'Average',
            },
            {
                evaluationId: 'POOR',
                name: 'Poor',
            },
            {
                evaluationId: 'NEEDS_IMPROVEMENT',
                name: 'Needs Improvement',
            },
        ];
        for (const e of evaluations) {
            await prisma.evaluation.upsert({
                where: { evaluationId: e.evaluationId },
                update: e,
                create: e,
            });
        }

        // **Booths**
        const booths = [
            {
                boothId: 'B1',
                name: 'Booth 1',
            },
            {
                boothId: 'B2',
                name: 'Booth 2',
            },
            {
                boothId: 'B3',
                name: 'Booth 3',
            },
            {
                boothId: 'B4',
                name: 'Booth 4',
            },
            {
                boothId: 'B5',
                name: 'Booth 5',
            },
        ];
        for (const b of booths) {
            await prisma.booth.upsert({
                where: { boothId: b.boothId },
                update: b,
                create: b,
            });
        }

        // **Class Types**
        const classTypes = [
            {
                classTypeId: 'GROUP',
                name: 'Group',
            },
            {
                classTypeId: 'INDIVIDUAL',
                name: 'Individual',
            },
            {
                classTypeId: 'ONLINE',
                name: 'Online',
            },
            {
                classTypeId: 'HYBRID',
                name: 'Hybrid',
            },
        ];
        for (const ct of classTypes) {
            await prisma.classType.upsert({
                where: { classTypeId: ct.classTypeId },
                update: ct,
                create: ct,
            });
        }

        // **Time Slots**
        const timeSlots = [
            {
                timeSlotId: 'TS1',
                startTime: new Date(),
                endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
            },
            {
                timeSlotId: 'TS2',
                startTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
                endTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours later
            },
            {
                timeSlotId: 'TS3',
                startTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours later
                endTime: new Date(new Date().getTime() + 3 * 60 * 60 * 1000), // 3 hours later
            },
            {
                timeSlotId: 'TS4',
                startTime: new Date(new Date().getTime() + 3 * 60 * 60 * 1000), // 3 hours later
                endTime: new Date(new Date().getTime() + 4 * 60 * 60 * 1000), // 4 hours later
            },
            {
                timeSlotId: 'TS5',
                startTime: new Date(new Date().getTime() + 4 * 60 * 60 * 1000), // 4 hours later
                endTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000), // 5 hours later
            },
        ];
        for (const ts of timeSlots) {
            await prisma.timeSlot.upsert({
                where: { timeSlotId: ts.timeSlotId },
                update: ts,
                create: ts,
            });
        }

        // **Subjects**
        const subjects = [
            {
                subjectId: 'MATH101',
                name: 'Algebra',
                subjectTypeId: 'MATH',
            },
            {
                subjectId: 'ENG201',
                name: 'Literature',
                subjectTypeId: 'ENG',
            },
            {
                subjectId: 'SCI301',
                name: 'Biology',
                subjectTypeId: 'SCI',
            },
            {
                subjectId: 'HIST401',
                name: 'World History',
                subjectTypeId: 'HIST',
            },
            {
                subjectId: 'ART501',
                name: 'Painting',
                subjectTypeId: 'ART',
            },
        ];
        for (const s of subjects) {
            await prisma.subject.upsert({
                where: { subjectId: s.subjectId },
                update: s,
                create: s,
            });
        }

        // **Teachers**
        const teachers = [
            {
                teacherId: 'T1',
                name: 'John Doe',
                evaluationId: 'EXCELLENT',
                birthDate: new Date('1980-01-01T00:00:00Z'),
                email: 'john@example.com',
            },
            {
                teacherId: 'T2',
                name: 'Jane Smith',
                evaluationId: 'GOOD',
                birthDate: new Date('1985-05-15T00:00:00Z'),
                email: 'jane@example.com',
            },
            {
                teacherId: 'T3',
                name: 'Bob Johnson',
                evaluationId: 'AVERAGE',
                birthDate: new Date('1990-10-20T00:00:00Z'),
                email: 'bob@example.com',
            },
        ];
        for (const t of teachers) {
            await prisma.teacher.upsert({
                where: { teacherId: t.teacherId },
                update: t,
                create: t,
            });
        }

        // **Students**
        const students = [
            {
                studentId: 'S1',
                name: 'Alice',
                gradeId: 'ELEM6',
                schoolName: 'Elementary School A',
                birthDate: new Date('2010-04-01T00:00:00Z'),
            },
            {
                studentId: 'S2',
                name: 'Ben',
                gradeId: 'JH3',
                schoolName: 'Junior High B',
                birthDate: new Date('2008-07-15T00:00:00Z'),
            },
            {
                studentId: 'S3',
                name: 'Cathy',
                gradeId: 'HS2',
                schoolName: 'High School C',
                birthDate: new Date('2006-11-30T00:00:00Z'),
            },
        ];
        for (const s of students) {
            await prisma.student.upsert({
                where: { studentId: s.studentId },
                update: s,
                create: s,
            });
        }

        // **Courses (intensiveCourses)**
        const courses = [
            {
                courseId: 'C1',
                name: 'Math Intensive',
                subjectId: 'MATH101',
                gradeId: 'ELEM6',
                classDuration: "60",
                classSessions: "10",
                sessionType: 'GROUP',
            },
            {
                courseId: 'C2',
                name: 'English Remedial',
                subjectId: 'ENG201',
                gradeId: 'JH3',
                classDuration: "45",
                classSessions: "5",
                sessionType: 'INDIVIDUAL',
            },
            {
                courseId: 'C3',
                name: 'Science Advanced',
                subjectId: 'SCI301',
                gradeId: 'HS2',
                classDuration: "90",
                classSessions: "8",
                sessionType: 'GROUP',
            },
        ];
        for (const c of courses) {
            await prisma.intensiveCourse.upsert({
                where: { courseId: c.courseId },
                update: c,
                create: c,
            });
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seed().catch((error) => {
    console.error(error);
    process.exit(1);
});