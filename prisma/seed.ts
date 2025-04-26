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
      username: "ADMIN01",
    },
  });
  console.log(`Seeded admin user: ${adminUser.email}`);

  const teacherUser = await prisma.user.create({
    data: {
      name: "Teacher User",
      email: "teacher@teacher.com",
      passwordHash: "teacher123",
      role: "TEACHER",
      username: "TEACHER01",
    },
  });
  console.log(`Seeded teacher user: ${teacherUser.email}`);

  const studentUser = await prisma.user.create({
    data: {
      name: "Student User",
      email: "student@student.com",
      passwordHash: "student123",
      role: "STUDENT",
      username: "STUDENT01",
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

  // **Link teacherUser to a new Teacher record**
  const linkedTeacher = await prisma.teacher.create({
    data: {
      name: "Linked Teacher",
      evaluationId: faker.helpers.arrayElement(evaluations).evaluationId,
      birthDate: faker.date.birthdate(),
      mobileNumber: faker.phone.number().slice(0, 20),
      email: teacherUser.email,
      highSchool: faker.company.name().slice(0, 100),
      university: faker.company.name().slice(0, 100),
      faculty: faker.lorem.word().slice(0, 100),
      department: faker.lorem.word().slice(0, 100),
      userId: teacherUser.id, // Link to teacherUser
      notes: "Linked to teacher user",
    },
  });
  console.log(`Seeded linked teacher: ${linkedTeacher.name}`);

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

  // **Link studentUser to a new Student record**
  const linkedStudent = await prisma.student.create({
    data: {
      name: "Linked Student",
      kanaName: faker.person.lastName().slice(0, 100),
      gradeId: faker.helpers.arrayElement(grades).gradeId,
      schoolName: faker.company.name().slice(0, 100),
      enrollmentDate: faker.date.past(),
      birthDate: faker.date.birthdate(),
      homePhone: faker.phone.number().slice(0, 20),
      parentMobile: faker.phone.number().slice(0, 20),
      studentMobile: faker.phone.number().slice(0, 20),
      parentEmail: studentUser.email,
      userId: studentUser.id, // Link to studentUser
      notes: "Linked to student user",
    },
  });
  console.log(`Seeded linked student: ${linkedStudent.name}`);

  // **Create TeacherSubject relationships**
  const teacherSubjects = await Promise.all(
    Array.from({ length: 40 }).map(async () => {
      const teacher = faker.helpers.arrayElement(teachers);
      const subject = faker.helpers.arrayElement(subjects);

      try {
        return await prisma.teacherSubject.create({
          data: {
            teacherId: teacher.teacherId,
            subjectId: subject.subjectId,
            notes: faker.lorem.sentence(),
          },
        });
      } catch {
        // Skip duplicates
        return null;
      }
    })
  );
  console.log(
    `Seeded ${
      teacherSubjects.filter(Boolean).length
    } teacher subject relationships.`
  );

  // **Create Regular Class Templates**
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const regularClassTemplates = await Promise.all(
    Array.from({ length: 30 }).map(() => {
      // Create a time between 9:00 and 20:00
      const hour = faker.number.int({ min: 9, max: 20 });
      const startTime = new Date();
      startTime.setHours(hour, 0, 0, 0);

      // Classes are 1-2 hours long
      const duration = faker.number.int({ min: 1, max: 2 });
      const endTime = new Date(startTime);
      endTime.setHours(hour + duration, 0, 0, 0);

      // Start and end dates (with endDate at least 3 months after startDate)
      const startDate = faker.date.future();
      const endDate = new Date(startDate);
      endDate.setMonth(
        startDate.getMonth() + faker.number.int({ min: 3, max: 12 })
      );

      return prisma.regularClassTemplate.create({
        data: {
          dayOfWeek: faker.helpers.arrayElement(daysOfWeek),
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          boothId: faker.helpers.arrayElement(booths).boothId,
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          startTime,
          endTime,
          startDate,
          endDate,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(
    `Seeded ${regularClassTemplates.length} regular class templates.`
  );

  // **Create Teacher Regular Shifts**
  const teacherRegularShifts = await Promise.all(
    Array.from({ length: 50 }).map(() => {
      // Create a time between 8:00 and 22:00
      const hour = faker.number.int({ min: 8, max: 22 });
      const startTime = new Date();
      startTime.setHours(hour, 0, 0, 0);

      // Shifts are 2-8 hours long
      const duration = faker.number.int({ min: 2, max: 8 });
      const endTime = new Date(startTime);
      endTime.setHours(hour + duration, 0, 0, 0);

      // Create JSON for preferred weekdays and times
      const preferredWeekdaysTimes = {
        Monday: faker.datatype.boolean(),
        Tuesday: faker.datatype.boolean(),
        Wednesday: faker.datatype.boolean(),
        Thursday: faker.datatype.boolean(),
        Friday: faker.datatype.boolean(),
        Saturday: faker.datatype.boolean(),
        Sunday: faker.datatype.boolean(),
      };

      // Create arrays for preferred subjects and teachers
      const preferredSubjects = Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.helpers.arrayElement(subjects).subjectId
      );

      const preferredTeachers = Array.from(
        { length: faker.number.int({ min: 0, max: 3 }) },
        () => faker.helpers.arrayElement(teachers).teacherId
      );

      return prisma.teacherRegularShift.create({
        data: {
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          dayOfWeek: faker.helpers.arrayElement(daysOfWeek),
          startTime,
          endTime,
          preferredWeekdaysTimes,
          preferredSubjects,
          preferredTeachers,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(`Seeded ${teacherRegularShifts.length} teacher regular shifts.`);

  // **Create Teacher Special Shifts**
  const teacherSpecialShifts = await Promise.all(
    Array.from({ length: 40 }).map(() => {
      // Create a time between 8:00 and 22:00
      const hour = faker.number.int({ min: 8, max: 22 });
      const startTime = new Date();
      startTime.setHours(hour, 0, 0, 0);

      // Shifts are 2-8 hours long
      const duration = faker.number.int({ min: 2, max: 8 });
      const endTime = new Date(startTime);
      endTime.setHours(hour + duration, 0, 0, 0);

      // Special shifts occur on a specific date
      const date = faker.date.future();

      // Create JSON for preferred weekdays and times
      const preferredWeekdaysTimes = {
        Monday: faker.datatype.boolean(),
        Tuesday: faker.datatype.boolean(),
        Wednesday: faker.datatype.boolean(),
        Thursday: faker.datatype.boolean(),
        Friday: faker.datatype.boolean(),
        Saturday: faker.datatype.boolean(),
        Sunday: faker.datatype.boolean(),
      };

      // Create arrays for preferred subjects and teachers
      const preferredSubjects = Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.helpers.arrayElement(subjects).subjectId
      );

      const preferredTeachers = Array.from(
        { length: faker.number.int({ min: 0, max: 3 }) },
        () => faker.helpers.arrayElement(teachers).teacherId
      );

      return prisma.teacherSpecialShift.create({
        data: {
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          date,
          startTime,
          endTime,
          preferredWeekdaysTimes,
          preferredSubjects,
          preferredTeachers,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(`Seeded ${teacherSpecialShifts.length} teacher special shifts.`);

  // **Create Template Student Assignments**
  const templateStudentAssignments = await Promise.all(
    Array.from({ length: 60 }).map(async () => {
      const template = faker.helpers.arrayElement(regularClassTemplates);
      const student = faker.helpers.arrayElement(students);

      try {
        return await prisma.templateStudentAssignment.create({
          data: {
            templateId: template.templateId,
            studentId: student.studentId,
            notes: faker.lorem.sentence(),
          },
        });
      } catch {
        // Skip duplicates
        return null;
      }
    })
  );
  console.log(
    `Seeded ${
      templateStudentAssignments.filter(Boolean).length
    } template student assignments.`
  );

  // **Create Class Sessions**
  const classSessions = await Promise.all(
    Array.from({ length: 80 }).map(() => {
      // Create a date in the next 3 months
      const date = faker.date.future({ years: 0.25 });

      // Create a time between 9:00 and 20:00
      const hour = faker.number.int({ min: 9, max: 20 });
      const startTime = new Date();
      startTime.setHours(hour, 0, 0, 0);

      // Classes are 1-2 hours long
      const duration = faker.number.int({ min: 1, max: 2 });
      const endTime = new Date(startTime);
      endTime.setHours(hour + duration, 0, 0, 0);

      // Create a duration time object
      const durationTime = new Date();
      durationTime.setHours(0, duration * 60, 0, 0);

      // Decide whether to link to a template or not
      const useTemplate = faker.datatype.boolean();
      const templateId = useTemplate
        ? faker.helpers.arrayElement(regularClassTemplates).templateId
        : null;

      return prisma.classSession.create({
        data: {
          date,
          startTime,
          endTime,
          duration: durationTime,
          teacherId: faker.helpers.arrayElement(teachers).teacherId,
          studentId: faker.helpers.arrayElement(students).studentId,
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          boothId: faker.helpers.arrayElement(booths).boothId,
          classTypeId: faker.helpers.arrayElement(classTypes).classTypeId,
          templateId,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(`Seeded ${classSessions.length} class sessions.`);

  // **Create Student Class Enrollments**
  const studentClassEnrollments = await Promise.all(
    Array.from({ length: 120 }).map(async () => {
      const classSession = faker.helpers.arrayElement(classSessions);
      const student = faker.helpers.arrayElement(students);
      const status = faker.helpers.arrayElement([
        "Confirmed",
        "Pending",
        "Cancelled",
        "Completed",
      ]);

      try {
        return await prisma.studentClassEnrollment.create({
          data: {
            classId: classSession.classId,
            studentId: student.studentId,
            status,
            notes: faker.lorem.sentence(),
          },
        });
      } catch {
        // Skip duplicates
        return null;
      }
    })
  );
  console.log(
    `Seeded ${
      studentClassEnrollments.filter(Boolean).length
    } student class enrollments.`
  );

  // **Create Student Regular Preferences**
  const studentRegularPreferences = await Promise.all(
    Array.from({ length: 40 }).map(() => {
      // Create JSON for preferred weekdays and times
      const preferredWeekdaysTimes = {
        Monday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Tuesday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Wednesday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Thursday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Friday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Saturday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Sunday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
      };

      // Create arrays for preferred subjects and teachers
      const preferredSubjects = Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.helpers.arrayElement(subjects).subjectId
      );

      const preferredTeachers = Array.from(
        { length: faker.number.int({ min: 0, max: 3 }) },
        () => faker.helpers.arrayElement(teachers).teacherId
      );

      return prisma.studentRegularPreference.create({
        data: {
          studentId: faker.helpers.arrayElement(students).studentId,
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          preferredWeekdaysTimes,
          preferredSubjects,
          preferredTeachers,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(
    `Seeded ${studentRegularPreferences.length} student regular preferences.`
  );

  // **Create Student Special Preferences**
  const studentSpecialPreferences = await Promise.all(
    Array.from({ length: 30 }).map(() => {
      // Create a date in the next 3 months
      const date = faker.date.future({ years: 0.25 });

      // Create a time between 9:00 and 20:00
      const hour = faker.number.int({ min: 9, max: 20 });
      const startTime = new Date();
      startTime.setHours(hour, 0, 0, 0);

      // Classes are 1-2 hours long
      const duration = faker.number.int({ min: 1, max: 2 });
      const endTime = new Date(startTime);
      endTime.setHours(hour + duration, 0, 0, 0);

      // Create JSON for preferred weekdays and times
      const preferredWeekdaysTimes = {
        Monday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Tuesday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Wednesday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Thursday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Friday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Saturday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
        Sunday: {
          morning: faker.datatype.boolean(),
          afternoon: faker.datatype.boolean(),
          evening: faker.datatype.boolean(),
        },
      };

      // Create arrays for preferred subjects and teachers
      const preferredSubjects = Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => faker.helpers.arrayElement(subjects).subjectId
      );

      const preferredTeachers = Array.from(
        { length: faker.number.int({ min: 0, max: 3 }) },
        () => faker.helpers.arrayElement(teachers).teacherId
      );

      return prisma.studentSpecialPreference.create({
        data: {
          studentId: faker.helpers.arrayElement(students).studentId,
          classTypeId: faker.helpers.arrayElement(classTypes).classTypeId,
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          date,
          startTime,
          endTime,
          preferredWeekdaysTimes,
          preferredSubjects,
          preferredTeachers,
          notes: faker.lorem.sentence(),
        },
      });
    })
  );
  console.log(
    `Seeded ${studentSpecialPreferences.length} student special preferences.`
  );

  // **Create Intensive Courses**
  const intensiveCourseTypes = ["SUMMER", "SPRING", "WINTER", "AUTUMN"];

  const intensiveCourses = await Promise.all(
    Array.from({ length: 15 }).map(() => {
      // Create a duration (1-3 hours)
      const hours = faker.number.int({ min: 1, max: 3 });
      const duration = new Date();
      duration.setHours(hours, 0, 0, 0);

      return prisma.intensiveCourse.create({
        data: {
          courseId: faker.string.uuid(),
          name: faker.lorem.words(3),
          subjectId: faker.helpers.arrayElement(subjects).subjectId,
          gradeId: faker.helpers.arrayElement(grades).gradeId,
          classDuration: duration,
          classSessions: faker.number.int({ min: 3, max: 15 }).toString(),
          sessionType: faker.helpers.arrayElement(
            intensiveCourseTypes
          ) as unknown as import("@prisma/client").IntensiveCourseType,
        },
      });
    })
  );
  console.log(`Seeded ${intensiveCourses.length} intensive courses.`);

  // **Create Course Assignments** (Teachers assigned to intensive courses)
  const courseAssignments = await Promise.all(
    Array.from({ length: 25 }).map(async () => {
      const teacher = faker.helpers.arrayElement(teachers);
      const course = faker.helpers.arrayElement(intensiveCourses);
      const status = faker.helpers.arrayElement([
        "Assigned",
        "Pending",
        "Declined",
        "Completed",
      ]);

      try {
        return await prisma.courseAssignment.create({
          data: {
            teacherId: teacher.teacherId,
            courseId: course.courseId,
            assignmentDate: faker.date.recent(),
            status,
            notes: faker.lorem.sentence(),
          },
        });
      } catch {
        // Skip duplicates
        return null;
      }
    })
  );
  console.log(
    `Seeded ${courseAssignments.filter(Boolean).length} course assignments.`
  );

  // **Create Course Enrollments** (Students enrolled in intensive courses)
  const courseEnrollments = await Promise.all(
    Array.from({ length: 35 }).map(async () => {
      const student = faker.helpers.arrayElement(students);
      const course = faker.helpers.arrayElement(intensiveCourses);
      const status = faker.helpers.arrayElement([
        "Enrolled",
        "Pending",
        "Cancelled",
        "Completed",
      ]);

      try {
        return await prisma.courseEnrollment.create({
          data: {
            studentId: student.studentId,
            courseId: course.courseId,
            enrollmentDate: faker.date.recent(),
            status,
            notes: faker.lorem.sentence(),
          },
        });
      } catch {
        // Skip duplicates
        return null;
      }
    })
  );
  console.log(
    `Seeded ${courseEnrollments.filter(Boolean).length} course enrollments.`
  );

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
