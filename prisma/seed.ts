import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/ja';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding started...');


    // Create Users
    const users = await Promise.all(
        Array.from({ length: 30 }).map(() =>
            prisma.user.create({
                data: {
                    name: faker.person.fullName(),
                    email: faker.internet.email(),
                    username: faker.internet.username(), // Updated here!
                    passwordHash: faker.internet.password(),
                    role: 'user',
                },
            })
        )
    );
    console.log(`Seeded ${users.length} users.`);

    // Create Booths
    const booths = await Promise.all(
        Array.from({ length: 25 }).map(() =>
            prisma.booth.create({
                data: {
                    boothId: faker.string.uuid(),
                    name: faker.company.name(),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${booths.length} booths.`);

    // Create Class Types
    const classTypes = await Promise.all(
        Array.from({ length: 20 }).map(() =>
            prisma.classType.create({
                data: {
                    classTypeId: faker.string.uuid(),
                    name: faker.lorem.word(),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${classTypes.length} class types.`);

    // Create Subject Types
    const subjectTypes = await Promise.all(
        Array.from({ length: 15 }).map(() =>
            prisma.subjectType.create({
                data: {
                    subjectTypeId: faker.string.uuid(),
                    name: faker.lorem.word(),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${subjectTypes.length} subject types.`);

    // Create Subjects
    const subjects = await Promise.all(
        Array.from({ length: 30 }).map(() =>
            prisma.subject.create({
                data: {
                    subjectId: faker.string.uuid(),
                    name: faker.lorem.word(),
                    subjectTypeId: faker.helpers.arrayElement(subjectTypes).subjectTypeId,
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${subjects.length} subjects.`);

    // Create Grades
    const grades = await Promise.all(
        Array.from({ length: 20 }).map(() =>
            prisma.grade.create({
                data: {
                    gradeId: faker.string.uuid(),
                    name: faker.lorem.word(),
                    gradeYear: faker.number.int({ min: 1, max: 12 }),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${grades.length} grades.`);

    const students = await Promise.all(
        Array.from({ length: 50 }).map(() => {
            let kanaName = faker.person.lastName().slice(0, 100); // Simplified truncation
            const name = faker.person.fullName().slice(0, 100);
            const schoolName = faker.company.name().slice(0, 100);
            const homePhone = faker.phone.number().slice(0, 20);
            const parentMobile = faker.phone.number().slice(0, 20);
            const studentMobile = faker.phone.number().slice(0, 20);
            const parentEmail = faker.internet.email().slice(0, 100);
            return prisma.student.create({
                data: {
                    studentId: faker.string.uuid(),
                    name,
                    kanaName,
                    gradeId: faker.helpers.arrayElement(grades).gradeId,
                    schoolName,
                    enrollmentDate: faker.date.past(),
                    birthDate: faker.date.birthdate(),
                    homePhone,
                    parentMobile,
                    studentMobile,
                    parentEmail,
                    notes: faker.lorem.sentence(),
                },
            });
        })
    );
    console.log(`Seeded ${students.length} students.`);

    // Create Teachers
    const teachers = await Promise.all(
        Array.from({ length: 30 }).map(() => {
            const name = faker.person.fullName().slice(0, 100);
            const mobileNumber = faker.phone.number().slice(0, 20);
            const email = faker.internet.email().slice(0, 100);
            const highSchool = faker.company.name().slice(0, 100);
            const university = faker.company.name().slice(0, 100);
            const faculty = faker.lorem.word().slice(0, 100); // Unlikely to exceed, but included for safety
            const department = faker.lorem.word().slice(0, 100); // Unlikely to exceed, but included for safety
            return prisma.teacher.create({
                data: {
                    teacherId: faker.string.uuid(),
                    name,
                    birthDate: faker.date.birthdate(),
                    mobileNumber,
                    email,
                    highSchool,
                    university,
                    faculty,
                    department,
                    notes: faker.lorem.sentence(),
                },
            });
        })
    );
    console.log(`Seeded ${teachers.length} teachers.`);

    // Create Class Sessions
    const classSessions = await Promise.all(
        Array.from({ length: 60 }).map(() =>
            prisma.classSession.create({
                data: {
                    classId: faker.string.uuid(),
                    date: faker.date.future(),
                    startTime: faker.date.recent(),
                    endTime: faker.date.future(),
                    teacherId: faker.helpers.arrayElement(teachers).teacherId,
                    subjectId: faker.helpers.arrayElement(subjects).subjectId,
                    boothId: faker.helpers.arrayElement(booths).boothId,
                    classTypeId: faker.helpers.arrayElement(classTypes).classTypeId,
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${classSessions.length} class sessions.`);

    // Create Student Class Enrollments
    await Promise.all(
        Array.from({ length: 120 }).map(() =>
            prisma.studentClassEnrollment.create({
                data: {
                    enrollmentId: faker.string.uuid(),
                    classId: faker.helpers.arrayElement(classSessions).classId,
                    studentId: faker.helpers.arrayElement(students).studentId,
                    status: faker.lorem.word(),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded 120 student class enrollments.`);

    // Create Regular Class Templates
    const regularClassTemplates = await Promise.all(
        Array.from({ length: 30 }).map(() =>
            prisma.regularClassTemplate.create({
                data: {
                    templateId: faker.string.uuid(),
                    dayOfWeek: faker.date.weekday(),
                    subjectId: faker.helpers.arrayElement(subjects).subjectId,
                    boothId: faker.helpers.arrayElement(booths).boothId,
                    teacherId: faker.helpers.arrayElement(teachers).teacherId,
                    startTime: faker.date.recent(),
                    endTime: faker.date.future(),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded ${regularClassTemplates.length} regular class templates.`);

    // Create Template Student Assignments
    await Promise.all(
        Array.from({ length: 60 }).map(() =>
            prisma.templateStudentAssignment.create({
                data: {
                    assignmentId: faker.string.uuid(),
                    templateId: faker.helpers.arrayElement(regularClassTemplates).templateId,
                    studentId: faker.helpers.arrayElement(students).studentId,
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded 60 template student assignments.`);

    // Create Intensive Courses
    const intensiveCourses = await Promise.all(
        Array.from({ length: 30 }).map(() =>
            prisma.intensiveCourse.create({
                data: {
                    courseId: faker.string.uuid(),
                    name: faker.lorem.word(),
                    subjectId: faker.helpers.arrayElement(subjects).subjectId,
                    gradeId: faker.helpers.arrayElement(grades).gradeId,
                    classDuration: faker.date.recent(),
                    classSessions: faker.number.int({ min: 5, max: 20 }).toString(),
                    sessionType: faker.helpers.arrayElement(['SUMMER', 'SPRING', 'WINTER', 'AUTUMN']),
                },
            })
        )
    );
    console.log(`Seeded ${intensiveCourses.length} intensive courses.`);

    // Create Course Assignments
    const teacherIds = teachers.map(t => t.teacherId);
    const courseIds = intensiveCourses.map(c => c.courseId);

    // Shuffle courses for random assignments
    const shuffledCourses = faker.helpers.shuffle([...courseIds]); // Copy to avoid modifying original

    await Promise.all(
        teacherIds.flatMap((teacherId, index) => {
            // Assign two unique courses per teacher
            const startIndex = index * 2;
            const assignedCourses = shuffledCourses.slice(startIndex, startIndex + 2);
            return assignedCourses.map(courseId =>
                prisma.courseAssignment.create({
                    data: {
                        teacherId,
                        courseId,
                        assignmentDate: faker.date.future(),
                        status: faker.lorem.word(),
                        notes: faker.lorem.sentence(),
                    },
                })
            );
        })
    );
    console.log(`Seeded 60 course assignments.`);

    // Create Notifications
    await Promise.all(
        Array.from({ length: 50 }).map(() =>
            prisma.notification.create({
                data: {
                    notificationId: faker.string.uuid(),
                    recipientType: faker.lorem.word(),
                    recipientId: faker.string.uuid(),
                    notificationType: faker.lorem.word(),
                    message: faker.lorem.sentence(),
                    relatedClassId: faker.helpers.arrayElement(classSessions).classId,
                    sentVia: faker.lorem.word(),
                    sentAt: faker.date.past(),
                    readAt: faker.date.future(),
                    status: faker.lorem.word(),
                    notes: faker.lorem.sentence(),
                },
            })
        )
    );
    console.log(`Seeded 50 notifications.`);

    // Create Events
    await Promise.all(
        Array.from({ length: 30 }).map(() =>
            prisma.event.create({
                data: {
                    id: faker.string.uuid(),
                    name: faker.lorem.word(),
                    startDate: faker.date.past(),
                    endDate: faker.date.future(),
                    isRecurring: faker.datatype.boolean(),
                },
            })
        )
    );
    console.log(`Seeded ${30} events.`);

    console.log('Seeding complete');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });