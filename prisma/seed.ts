import { PrismaClient, DayOfWeek, UserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

// 手動で Enum を作る（参考）
/*
CREATE TYPE "DayOfWeek" AS ENUM
  ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');
*/

// ---------- サンプル固定データ ----------
const studentTypeSeeds = [
  { name: "小学生", description: "小学1–6年" },
  { name: "中学生", description: "中学1–3年" },
  { name: "高校生", description: "高校1–3年" },
];

const gradeSeeds = [
  { name: "小学6年生", type: "小学生", year: 6 },
  { name: "中学3年生", type: "中学生", year: 3 },
  { name: "高校3年生", type: "高校生", year: 3 },
];

const subjectTypeSeeds = [
  { name: "言語", notes: "国語・英語など" },
  { name: "数学", notes: "算数・数学" },
  { name: "理科", notes: "物理・化学・生物" },
];

const subjectSeeds = [
  { name: "国語", type: "言語" },
  { name: "数学", type: "数学" },
  { name: "英語", type: "言語" },
  { name: "物理", type: "理科" },
  { name: "理科", type: "理科" }, // Added for Teacher 3
];

const classTypeSeeds = [
  { name: "通常授業", notes: "週次の通常授業" },
  { name: "特別補習", notes: "試験前集中" },
];

const evaluationSeeds = [
  { name: "S", score: 90 },
  { name: "A", score: 80 },
  { name: "B", score: 70 },
];

const boothSeeds = ["Booth-A", "Booth-B", "Booth-C"].map((n) => ({
  name: n,
}));

// ---------- メイン処理 ----------
async function main() {
  console.log("🌱  シード開始");

  /* 1. ユーザ */
  const [
    adminUser,
    teacherUser,
    studentUser,
    teacherUser2,
    teacherUser3,
    studentUser2,
    studentUser3,
  ] = await Promise.all([
    prisma.user.create({
      data: {
        name: "管理者",
        email: "admin@example.com",
        username: "ADMIN01",
        passwordHash: hashSync("admin123", 10),
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        name: "山田 太郎",
        email: "teacher@example.com",
        username: "TEACHER01",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "佐藤 花子",
        email: "student@example.com",
        username: "STUDENT01",
        passwordHash: ("student123"),
        role: UserRole.STUDENT,
      },
    }),
    // New Teacher Users
    prisma.user.create({
      data: {
        name: "鈴木 次郎",
        email: "teacher2@example.com",
        username: "TEACHER02",
        passwordHash: ("teacher123"),
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "田中 三郎",
        email: "teacher3@example.com",
        username: "TEACHER03",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    // New Student Users
    prisma.user.create({
      data: {
        name: "高橋 健太",
        email: "student2@example.com",
        username: "STUDENT02",
        passwordHash: "student123",
        role: UserRole.STUDENT,
      },
    }),
    prisma.user.create({
      data: {
        name: "伊藤 美咲",
        email: "student3@example.com",
        username: "STUDENT03",
        passwordHash: "student123",
        role: UserRole.STUDENT,
      },
    }),
  ]);

  /* 2-a. StudentType */
  const studentTypes = await prisma.studentType.createMany({
    data: studentTypeSeeds,
    skipDuplicates: true,
  });
  const studentTypeMap = Object.fromEntries(
    (await prisma.studentType.findMany({ where: {} })).map((st) => [
      st.name,
      st.studentTypeId,
    ])
  );

  /* 2-b. Grade */
  await prisma.grade.createMany({
    data: gradeSeeds.map((g) => ({
      name: g.name,
      studentTypeId: studentTypeMap[g.type],
      gradeYear: g.year,
    })),
    skipDuplicates: true,
  });
  const gradeHi3 = await prisma.grade.findFirstOrThrow({
    where: { name: "高校3年生" },
  });
  const gradeElem6 = await prisma.grade.findFirstOrThrow({
    where: { name: "小学6年生" },
  });
  const gradeMid3 = await prisma.grade.findFirstOrThrow({
    where: { name: "中学3年生" },
  });

  /* 2-c. SubjectType & Subject */
  await prisma.subjectType.createMany({
    data: subjectTypeSeeds,
    skipDuplicates: true,
  });
  const subjectTypeMap = Object.fromEntries(
    (await prisma.subjectType.findMany({ where: {} })).map((st) => [
      st.name,
      st.subjectTypeId,
    ])
  );
  await prisma.subject.createMany({
    data: subjectSeeds.map((s) => ({
      name: s.name,
      subjectTypeId: subjectTypeMap[s.type],
    })),
    skipDuplicates: true,
  });
  const [jpSubject, mathSubject, enSubject, phySubject, sciSubject] =
    await prisma.subject.findMany({
      where: { name: { in: ["国語", "数学", "英語", "物理", "理科"] } },
    });

  /* 2-d. ClassType */
  await prisma.classType.createMany({
    data: classTypeSeeds,
    skipDuplicates: true,
  });
  const normalClassType = await prisma.classType.findFirstOrThrow({
    where: { name: "通常授業" },
  });

  /* 2-e. Evaluation */
  await prisma.evaluation.createMany({
    data: evaluationSeeds,
    skipDuplicates: true,
  });
  const evalS = await prisma.evaluation.findFirstOrThrow({
    where: { name: "S" },
  });

  /* 2-f. Booth */
  await prisma.booth.createMany({ data: boothSeeds, skipDuplicates: true });
  const boothA = await prisma.booth.findFirstOrThrow({
    where: { name: "Booth-A" },
  });

  /* 3. Teacher */
  const teacher = await prisma.teacher.create({
    data: {
      name: "山田 太郎",
      evaluationId: evalS.evaluationId,
      birthDate: new Date("1990-04-01"),
      mobileNumber: "080-0000-0001",
      email: teacherUser.email!,
      highSchool: "都立西高校",
      university: "東京大学",
      faculty: "教育学部",
      department: "教育学科",
      enrollmentStatus: "在籍",
      userId: teacherUser.id,
    },
  });

  // New Teachers
  const teacher2 = await prisma.teacher.create({
    data: {
      name: "鈴木 次郎",
      evaluationId: evalS.evaluationId,
      birthDate: new Date("1992-05-10"),
      mobileNumber: "080-0000-0002",
      email: teacherUser2.email!,
      highSchool: "都立東高校",
      university: "京都大学",
      faculty: "文学部",
      department: "国文学科",
      enrollmentStatus: "在籍",
      userId: teacherUser2.id,
    },
  });

  const teacher3 = await prisma.teacher.create({
    data: {
      name: "田中 三郎",
      evaluationId: evalS.evaluationId,
      birthDate: new Date("1988-07-20"),
      mobileNumber: "080-0000-0003",
      email: teacherUser3.email!,
      highSchool: "私立北高校",
      university: "早稲田大学",
      faculty: "理工学部",
      department: "物理学科",
      enrollmentStatus: "卒業",
      userId: teacherUser3.id,
    },
  });

  /* 4. Student */
  const student = await prisma.student.create({
    data: {
      name: "佐藤 花子",
      kanaName: "サトウ ハナコ",
      birthDate: new Date("2007-06-15"),
      gradeId: gradeHi3.gradeId,
      schoolName: "私立桜ヶ丘高校",
      enrollmentDate: new Date("2023-04-01"),
      parentMobile: "090-0000-0002",
      studentMobile: "080-0000-0003",
      parentEmail: "parent@example.com",
      userId: studentUser.id,
    },
  });

  // New Students
  const student2 = await prisma.student.create({
    data: {
      name: "高橋 健太",
      kanaName: "タカハシ ケンタ",
      birthDate: new Date("2010-08-20"),
      gradeId: gradeElem6.gradeId,
      schoolName: "公立桜小学校",
      enrollmentDate: new Date("2023-04-01"),
      parentMobile: "090-0000-0004",
      studentMobile: "080-0000-0005",
      parentEmail: "parent2@example.com",
      userId: studentUser2.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      name: "伊藤 美咲",
      kanaName: "イトウ ミサキ",
      birthDate: new Date("2008-03-15"),
      gradeId: gradeMid3.gradeId,
      schoolName: "私立梅中学校",
      enrollmentDate: new Date("2023-04-01"),
      parentMobile: "090-0000-0006",
      studentMobile: "080-0000-0007",
      parentEmail: "parent3@example.com",
      userId: studentUser3.id,
    },
  });

  /* 5. TeacherSubject (講師が教えられる科目) */
  await prisma.teacherSubject.createMany({
    data: [
      { teacherId: teacher.teacherId, subjectId: jpSubject.subjectId },
      { teacherId: teacher.teacherId, subjectId: mathSubject.subjectId },
      // Teacher 2 Subjects
      { teacherId: teacher2.teacherId, subjectId: enSubject.subjectId },
      { teacherId: teacher2.teacherId, subjectId: phySubject.subjectId },
      // Teacher 3 Subjects
      { teacherId: teacher3.teacherId, subjectId: mathSubject.subjectId },
      { teacherId: teacher3.teacherId, subjectId: sciSubject.subjectId },
    ],
    skipDuplicates: true,
  });

  /* 6. RegularClassTemplate (週次授業テンプレ) */
  const template = await prisma.regularClassTemplate.create({
    data: {
      classTypeId: normalClassType.classTypeId, // <-- added this line
      dayOfWeek: DayOfWeek.MONDAY,
      subjectId: mathSubject.subjectId,
      boothId: boothA.boothId,
      teacherId: teacher.teacherId,
      startTime: new Date("1970-01-01T15:00:00Z"), // 15:00
      endTime: new Date("1970-01-01T16:30:00Z"), // 16:30
      startDate: new Date("2025-05-01"),
      endDate: new Date("2026-03-31"),
      notes: "高3数学 週次枠",
    },
  });

  /* 7. TeacherShiftReference */
  await prisma.teacherShiftReference.createMany({
    data: [
      {
        teacherId: teacher.teacherId,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: new Date("1970-01-01T14:00:00Z"),
        endTime: new Date("1970-01-01T18:00:00Z"),
        notes: "月曜午後在室",
      },
      // Teacher 2 Shift
      {
        teacherId: teacher2.teacherId,
        dayOfWeek: DayOfWeek.TUESDAY,
        startTime: new Date("1970-01-01T13:00:00Z"), // 13:00
        endTime: new Date("1970-01-01T17:00:00Z"), // 17:00
        notes: "火曜午後在室",
      },
      // Teacher 3 Shift
      {
        teacherId: teacher3.teacherId,
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startTime: new Date("1970-01-01T09:00:00Z"), // 09:00
        endTime: new Date("1970-01-01T12:00:00Z"), // 12:00
        notes: "水曜午前在室",
      },
    ],
    skipDuplicates: true,
  });

  /* 8. StudentPreference & detail tables */
  const preference = await prisma.studentPreference.create({
    data: {
      studentId: student.studentId,
      classTypeId: normalClassType.classTypeId,
      notes: "数学強化を希望",
    },
  });
  await prisma.studentPreferenceTimeSlot.create({
    data: {
      preferenceId: preference.preferenceId,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: new Date("1970-01-01T15:00:00Z"),
      endTime: new Date("1970-01-01T16:30:00Z"),
    },
  });
  await prisma.studentPreferenceSubject.create({
    data: {
      studentPreferenceId: preference.preferenceId,
      subjectId: mathSubject.subjectId,
    },
  });
  await prisma.studentPreferenceTeacher.create({
    data: {
      studentPreferenceId: preference.preferenceId,
      teacherId: teacher.teacherId,
    },
  });

  // Student 2 Preference
  const preference2 = await prisma.studentPreference.create({
    data: {
      studentId: student2.studentId,
      classTypeId: normalClassType.classTypeId,
      notes: "英語の基礎を強化したい",
    },
  });
  await prisma.studentPreferenceTimeSlot.create({
    data: {
      preferenceId: preference2.preferenceId,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: new Date("1970-01-01T14:00:00Z"), // 14:00
      endTime: new Date("1970-01-01T15:30:00Z"), // 15:30
    },
  });
  await prisma.studentPreferenceSubject.create({
    data: {
      studentPreferenceId: preference2.preferenceId,
      subjectId: enSubject.subjectId,
    },
  });
  await prisma.studentPreferenceTeacher.create({
    data: {
      studentPreferenceId: preference2.preferenceId,
      teacherId: teacher2.teacherId,
    },
  });

  // Student 3 Preference
  const preference3 = await prisma.studentPreference.create({
    data: {
      studentId: student3.studentId,
      classTypeId: normalClassType.classTypeId,
      notes: "数学の応用問題に挑戦したい",
    },
  });
  await prisma.studentPreferenceTimeSlot.create({
    data: {
      preferenceId: preference3.preferenceId,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: new Date("1970-01-01T10:00:00Z"), // 10:00
      endTime: new Date("1970-01-01T11:30:00Z"), // 11:30
    },
  });
  await prisma.studentPreferenceSubject.create({
    data: {
      studentPreferenceId: preference3.preferenceId,
      subjectId: mathSubject.subjectId,
    },
  });
  await prisma.studentPreferenceTeacher.create({
    data: {
      studentPreferenceId: preference3.preferenceId,
      teacherId: teacher3.teacherId,
    },
  });

  /* 9. ClassSession (特別授業 1件) */
  const specialClass = await prisma.classSession.create({
    data: {
      date: new Date("2025-06-10"),
      startTime: new Date("1970-01-01T10:00:00Z"),
      endTime: new Date("1970-01-01T11:30:00Z"),
      duration: new Date("1970-01-01T01:30:00Z"),
      teacherId: teacher.teacherId,
      studentId: student.studentId,
      subjectId: jpSubject.subjectId,
      boothId: boothA.boothId,
      classTypeId: normalClassType.classTypeId,
      notes: "国語の定期テスト対策",
    },
  });

  /* 10. StudentClassEnrollment */
  await prisma.studentClassEnrollment.create({
    data: {
      classId: specialClass.classId,
      studentId: student.studentId,
      status: "Confirmed",
    },
  });

  /* 11. TemplateStudentAssignment */
  await prisma.templateStudentAssignment.create({
    data: {
      templateId: template.templateId,
      studentId: student.studentId,
    },
  });

  /* 12. Add a regular class session (from template) */
  const regularClassSession = await prisma.classSession.create({
    data: {
      date: new Date("2025-05-12"),
      startTime: new Date("1970-01-01T15:00:00Z"),
      endTime: new Date("1970-01-01T16:30:00Z"),
      duration: new Date("1970-01-01T01:30:00Z"),
      teacherId: teacher.teacherId,
      studentId: student.studentId,
      subjectId: mathSubject.subjectId,
      boothId: boothA.boothId,
      classTypeId: normalClassType.classTypeId,
      templateId: template.templateId,
      notes: "テンプレートから作成された通常授業",
    },
  });

  /* 13. Add a standalone class session (not from template) */
  const standaloneClassSession = await prisma.classSession.create({
    data: {
      date: new Date("2025-05-13"),
      startTime: new Date("1970-01-01T10:00:00Z"),
      endTime: new Date("1970-01-01T11:30:00Z"),
      duration: new Date("1970-01-01T01:30:00Z"),
      teacherId: teacher.teacherId,
      studentId: student.studentId,
      subjectId: mathSubject.subjectId,
      boothId: boothA.boothId,
      classTypeId: normalClassType.classTypeId,
      notes: "スタンドアロンの特別授業",
    },
  });

  console.log("✅  シード完了");
}

main()
  .catch((e) => {
    console.error("❌  シード失敗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
