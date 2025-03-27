import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    try {
        // **Subject Types**
        const subjectTypes = [
            { subject_type_id: 'core', name: 'Core' },
            { subject_type_id: 'elective', name: 'Elective' },
        ];
        for (const st of subjectTypes) {
            await prisma.subject_types.upsert({
                where: { subject_type_id: st.subject_type_id },
                update: st,
                create: st,
            });
        }

        // **Grades**
        const grades = [
            { grade_id: 'elem6', name: '小学6年', grade_type: 'elementary', grade_number: '6' },
            { grade_id: 'jh3', name: '中学3年', grade_type: 'junior_high', grade_number: '3' },
            { grade_id: 'hs2', name: '高校2年', grade_type: 'high_school', grade_number: '2' },
        ];
        for (const g of grades) {
            await prisma.grades.upsert({
                where: { grade_id: g.grade_id },
                update: g,
                create: g,
            });
        }

        // **Evaluations**
        const evaluations = [
            { evaluation_id: 'excellent', name: 'Excellent', score: 90 },
            { evaluation_id: 'good', name: 'Good', score: 80 },
            { evaluation_id: 'average', name: 'Average', score: 70 },
        ];
        for (const e of evaluations) {
            await prisma.evaluations.upsert({
                where: { evaluation_id: e.evaluation_id },
                update: e,
                create: e,
            });
        }

        // **Booths**
        const booths = [
            { booth_id: 'booth1', name: 'Booth 1' },
            { booth_id: 'booth2', name: 'Booth 2' },
            { booth_id: 'booth3', name: 'Booth 3' },
        ];
        for (const b of booths) {
            await prisma.booths.upsert({
                where: { booth_id: b.booth_id },
                update: b,
                create: b,
            });
        }

        // **Class Types**
        const classTypes = [
            { class_type_id: 'regular', name: 'Regular' },
            { class_type_id: 'intensive', name: 'Intensive' },
            { class_type_id: 'remedial', name: 'Remedial' },
        ];
        for (const ct of classTypes) {
            await prisma.class_types.upsert({
                where: { class_type_id: ct.class_type_id },
                update: ct,
                create: ct,
            });
        }

        // **Time Slots**
        const timeSlots = [
            { time_slot_id: 'ts1', start_time: '1970-01-01T09:00:00Z', end_time: '1970-01-01T10:00:00Z' },
            { time_slot_id: 'ts2', start_time: '1970-01-01T10:00:00Z', end_time: '1970-01-01T11:00:00Z' },
            { time_slot_id: 'ts3', start_time: '1970-01-01T11:00:00Z', end_time: '1970-01-01T12:00:00Z' },
        ];
        for (const ts of timeSlots) {
            await prisma.time_slots.upsert({
                where: { time_slot_id: ts.time_slot_id },
                update: ts,
                create: ts,
            });
        }

        // **Subjects**
        const subjects = [
            { subject_id: 'math', name: 'Mathematics', subject_type_id: 'core' },
            { subject_id: 'eng', name: 'English', subject_type_id: 'core' },
            { subject_id: 'sci', name: 'Science', subject_type_id: 'core' },
            { subject_id: 'art', name: 'Art', subject_type_id: 'elective' },
            { subject_id: 'music', name: 'Music', subject_type_id: 'elective' },
        ];
        for (const s of subjects) {
            await prisma.subjects.upsert({
                where: { subject_id: s.subject_id },
                update: s,
                create: s,
            });
        }

        // **Teachers**
        const teachers = [
            {
                teacher_id: 't1',
                name: 'John Doe',
                evaluation_id: 'excellent',
                birth_date: '1980-01-01T00:00:00Z',
                email: 'john@example.com',
            },
            {
                teacher_id: 't2',
                name: 'Jane Smith',
                evaluation_id: 'good',
                birth_date: '1985-05-15T00:00:00Z',
                email: 'jane@example.com',
            },
            {
                teacher_id: 't3',
                name: 'Bob Johnson',
                evaluation_id: 'average',
                birth_date: '1990-10-20T00:00:00Z',
                email: 'bob@example.com',
            },
        ];
        for (const t of teachers) {
            await prisma.teachers.upsert({
                where: { teacher_id: t.teacher_id },
                update: t,
                create: t,
            });
        }

        // **Students**
        const students = [
            {
                student_id: 's1',
                name: 'Alice',
                grade_id: 'elem6',
                school_name: 'Elementary School A',
                birth_date: '2010-04-01T00:00:00Z',
            },
            {
                student_id: 's2',
                name: 'Ben',
                grade_id: 'jh3',
                school_name: 'Junior High B',
                birth_date: '2008-07-15T00:00:00Z',
            },
            {
                student_id: 's3',
                name: 'Cathy',
                grade_id: 'hs2',
                school_name: 'High School C',
                birth_date: '2006-11-30T00:00:00Z',
            },
        ];
        for (const s of students) {
            await prisma.students.upsert({
                where: { student_id: s.student_id },
                update: s,
                create: s,
            });
        }

        // **Courses (intensive_courses)**
        const courses = [
            {
                course_id: 'c1',
                name: 'Math Intensive',
                subject_id: 'math',
                grade_id: 'elem6',
                class_duration: '60',
                class_sessions: '10',
                session_type: 'group',
            },
            {
                course_id: 'c2',
                name: 'English Remedial',
                subject_id: 'eng',
                grade_id: 'jh3',
                class_duration: '45',
                class_sessions: '5',
                session_type: 'individual',
            },
            {
                course_id: 'c3',
                name: 'Science Advanced',
                subject_id: 'sci',
                grade_id: 'hs2',
                class_duration: '90',
                class_sessions: '8',
                session_type: 'group',
            },
        ];
        for (const c of courses) {
            await prisma.intensive_courses.upsert({
                where: { course_id: c.course_id },
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