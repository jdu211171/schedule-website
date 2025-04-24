import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker/locale/ja";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // **Create Users** (1 admin, 1 teacher, 1 student)
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@admin.com",
      passwordHash: hashSync("admin123"),
      role: "ADMIN",
    },
  });
  console.log(`Seeded admin user: ${adminUser.email}`);

  const teacherUser = await prisma.user.create({
    data: {
      name: "Teacher User",
      email: "teacher@teacher.com",
      passwordHash: hashSync("teacher123"),
      role: "TEACHER",
    },
  });
  console.log(`Seeded teacher user: ${teacherUser.email}`);

  const studentUser = await prisma.user.create({
    data: {
      name: "Student User",
      email: "student@student.com",
      passwordHash: hashSync("student123"),
      role: "STUDENT",
    },
  });
  console.log(`Seeded student user: ${studentUser.email}`);

  // **Create StudentTypes** (before Grades due to reference)
  const studentTypes = await Promise.all(
    ["小学生", "中学生", "高校生", "浪人生", "大人"].map((name) =>
      prisma.studentType.create({
        data: {
          name,
          description: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${studentTypes.length} student types.`);

  const gradeData = [
    { name: "小学1年生", studentTypeName: "小学生", gradeYear: 1 },
    { name: "小学2年生", studentTypeName: "小学生", gradeYear: 2 },
    { name: "小学3年生", studentTypeName: "小学生", gradeYear: 3 },
    { name: "小学4年生", studentTypeName: "小学生", gradeYear: 4 },
    { name: "小学5年生", studentTypeName: "小学生", gradeYear: 5 },
    { name: "小学6年生", studentTypeName: "小学生", gradeYear: 6 },
    { name: "中学1年生", studentTypeName: "中学生", gradeYear: 1 },
    { name: "中学2年生", studentTypeName: "中学生", gradeYear: 2 },
    { name: "中学3年生", studentTypeName: "中学生", gradeYear: 3 },
    { name: "高校1年生", studentTypeName: "高校生", gradeYear: 1 },
    { name: "高校2年生", studentTypeName: "高校生", gradeYear: 2 },
    { name: "高校3年生", studentTypeName: "高校生", gradeYear: 3 },
    { name: "浪人生", studentTypeName: "浪人生", gradeYear: null },
    { name: "大人", studentTypeName: "大人", gradeYear: null },
  ];
  const studentTypeMap = new Map(
    studentTypes.map((st) => [st.name, st.studentTypeId])
  );

  // **Create Grades** (with studentTypeId)
  const grades = await Promise.all(
    gradeData.map(({ name, studentTypeName, gradeYear }) =>
      prisma.grade.create({
        data: {
          name,
          studentTypeId: studentTypeMap.get(studentTypeName),
          gradeYear,
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${grades.length} grades.`);

  // **Create Booths**
  const booths = await Promise.all(
    Array.from({ length: 25 }).map(() =>
      prisma.booth.create({
        data: {
          name: faker.location.buildingNumber(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${booths.length} booths.`);

  // **Create Class Types**
  const classTypes = await Promise.all(
    Array.from({ length: 20 }).map(() =>
      prisma.classType.create({
        data: {
          name: faker.lorem.word(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${classTypes.length} class types.`);

  // **Create Subject Types**
  const subjectTypes = await Promise.all(
    Array.from({ length: 15 }).map(() =>
      prisma.subjectType.create({
        data: {
          name: faker.lorem.word(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${subjectTypes.length} subject types.`);

  // **Create Subjects**
  const subjects = await Promise.all(
    Array.from({ length: 30 }).map(() =>
      prisma.subject.create({
        data: {
          name: faker.lorem.word(),
          subjectTypeId: faker.helpers.arrayElement(subjectTypes).subjectTypeId,
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${subjects.length} subjects.`);

  // **Create Evaluations** (before Teachers due to reference)
  const evaluations = await Promise.all(
    Array.from({ length: 10 }).map(() =>
      prisma.evaluation.create({
        data: {
          name: faker.lorem.word(),
          score: faker.number.int({ min: 1, max: 100 }),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded ${evaluations.length} evaluations.`);

  // **Create Teachers** (with evaluationId)
  const teachers = await Promise.all(
    Array.from({ length: 30 }).map(() => {
      const name = faker.person.fullName().slice(0, 100);
      const mobileNumber = faker.phone.number().slice(0, 20);
      const email = faker.internet.email().slice(0, 100);
      const highSchool = faker.company.name().slice(0, 100);
      const university = faker.company.name().slice(0, 100);
      const faculty = faker.lorem.word().slice(0, 100);
      const department = faker.lorem.word().slice(0, 100);
      return prisma.teacher.create({
        data: {
          name,
          evaluationId: faker.helpers.arrayElement(evaluations).evaluationId,
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

  // **Create Regular Class Templates**
  const regularClassTemplates = await Promise.all(
    Array.from({ length: 30 }).map(() =>
      prisma.regularClassTemplate.create({
        data: {
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
  console.log(
    `Seeded ${regularClassTemplates.length} regular class templates.`
  );

  // **Create Class Sessions** (some linked to templates, some exceptional)
  const classSessions = await Promise.all(
    Array.from({ length: 60 }).map(async () => {
      const isRegular = faker.datatype.boolean();
      const template = isRegular
        ? faker.helpers.arrayElement(regularClassTemplates)
        : null;
      return prisma.classSession.create({
        data: {
          date: faker.date.future(),
          startTime: faker.date.recent(),
          endTime: faker.date.future(),
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          boothId: faker.helpers.arrayElement(booths).boothId,
          classTypeId: faker.helpers.arrayElement(classTypes).classTypeId,
          templateId: template ? template.templateId : null,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(`Seeded ${classSessions.length} class sessions.`);

  // **Create Students**
  const students = await Promise.all(
    Array.from({ length: 50 }).map(() => {
      const kanaName = faker.person.lastName().slice(0, 100);
      const name = faker.person.fullName().slice(0, 100);
      const schoolName = faker.company.name().slice(0, 100);
      const homePhone = faker.phone.number().slice(0, 20);
      const parentMobile = faker.phone.number().slice(0, 20);
      const studentMobile = faker.phone.number().slice(0, 20);
      const parentEmail = faker.internet.email().slice(0, 100);
      return prisma.student.create({
        data: {
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

  // **Create Student Class Enrollments**
  await Promise.all(
    Array.from({ length: 120 }).map(() =>
      prisma.studentClassEnrollment.create({
        data: {
          classId: faker.helpers.arrayElement(classSessions).classId,
          studentId: faker.helpers.arrayElement(students).studentId,
          status: faker.lorem.word(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded 120 student class enrollments.`);

  // **Create Template Student Assignments**
  await Promise.all(
    Array.from({ length: 60 }).map(() =>
      prisma.templateStudentAssignment.create({
        data: {
          templateId: faker.helpers.arrayElement(regularClassTemplates)
            .templateId,
          studentId: faker.helpers.arrayElement(students).studentId,
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded 60 template student assignments.`);

  // **Create Intensive Courses**
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
          sessionType: faker.helpers.arrayElement([
            "SUMMER",
            "SPRING",
            "WINTER",
            "AUTUMN",
          ]),
        },
      })
    )
  );
  console.log(`Seeded ${intensiveCourses.length} intensive courses.`);

  // **Create Course Assignments**
  const teacherIds = teachers.map((t) => t.teacherId);
  const courseIds = intensiveCourses.map((c) => c.courseId);
  const shuffledCourses = faker.helpers.shuffle([...courseIds]);
  await Promise.all(
    teacherIds.flatMap((teacherId, index) => {
      const startIndex = index * 2;
      const assignedCourses = shuffledCourses.slice(startIndex, startIndex + 2);
      return assignedCourses.map((courseId) =>
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

  // **Create Notifications**
  await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.notification.create({
        data: {
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

  // **Create Events**
  await Promise.all(
    Array.from({ length: 30 }).map(() =>
      prisma.event.create({
        data: {
          name: faker.lorem.word(),
          startDate: faker.date.past(),
          endDate: faker.date.future(),
          isRecurring: faker.datatype.boolean(),
        },
      })
    )
  );
  console.log(`Seeded 30 events.`);

  // **Create StudentRegularPreferences**
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.studentRegularPreference.create({
        data: {
          studentId: faker.helpers.arrayElement(students).studentId,
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          preferredWeekdaysTimes: JSON.stringify(
            Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(
              () => ({
                dayOfWeek: faker.helpers.arrayElement(weekdays),
                startTime: faker.date.recent().toISOString(),
                endTime: faker.date.future().toISOString(),
              })
            )
          ),
          preferredSubjects: faker.helpers
            .arrayElements(subjects, { min: 1, max: 3 })
            .map((s) => s.subjectId),
          preferredTeachers: faker.helpers
            .arrayElements(teachers, { min: 1, max: 3 })
            .map((t) => t.teacherId),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded 50 student regular preferences.`);

  // **Create StudentSpecialPreferences**
  await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.studentSpecialPreference.create({
        data: {
          studentId: faker.helpers.arrayElement(students).studentId,
          classTypeId: faker.helpers.arrayElement(classTypes).classTypeId,
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          date: faker.date.future(),
          startTime: faker.date.recent(),
          endTime: faker.date.future(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded 50 student special preferences.`);

  // **Create TeacherRegularShifts**
  await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.teacherRegularShift.create({
        data: {
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          dayOfWeek: faker.date.weekday(),
          startTime: faker.date.recent(),
          endTime: faker.date.future(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded 50 teacher regular shifts.`);

  // **Create TeacherSpecialShifts**
  await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.teacherSpecialShift.create({
        data: {
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          date: faker.date.future(),
          startTime: faker.date.recent(),
          endTime: faker.date.future(),
          notes: faker.lorem.sentence(),
        },
      })
    )
  );
  console.log(`Seeded 50 teacher special shifts.`);

  // **Create TeacherSubjects**
  await Promise.all(
    teachers.flatMap((teacher) =>
      faker.helpers.arrayElements(subjects, { min: 2, max: 3 }).map((subject) =>
        prisma.teacherSubject.create({
          data: {
            teacherId: teacher.teacherId,
            subjectId: subject.subjectId,
            notes: faker.lorem.sentence(),
          },
        })
      )
    )
  );
  console.log(`Seeded teacher subjects.`);

  // **Create CourseEnrollments**
  await Promise.all(
    students.flatMap((student) =>
      faker.helpers
        .arrayElements(intensiveCourses, { min: 1, max: 2 })
        .map((course) =>
          prisma.courseEnrollment.create({
            data: {
              studentId: student.studentId,
              courseId: course.courseId,
              enrollmentDate: faker.date.past(),
              status: faker.lorem.word(),
              notes: faker.lorem.sentence(),
            },
          })
        )
    )
  );
  console.log(`Seeded course enrollments.`);

  console.log("Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
