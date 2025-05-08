import { PrismaClient, DayOfWeek, UserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

// ---------- サンプル固定データ ----------
const studentTypeSeeds = [
  { name: "小学生", description: "小学1–6年", maxYears: 6 },
  { name: "中学生", description: "中学1–3年", maxYears: 3 },
  { name: "高校生", description: "高校1–3年", maxYears: 3 },
];

const gradeSeeds = [
  { name: "小学6年生", type: "小学生", year: 6 },
  { name: "中学3年生", type: "中学生", year: 3 },
  { name: "高校3年生", type: "高校生", year: 3 },
];

const subjectTypeSeeds = [
  { name: "小学生", notes: "小学生向けの科目" },
  { name: "中学受験生", notes: "中学受験を目指す小学生向けの科目" },
  { name: "中学生", notes: "中学生向けの科目" },
  { name: "高校受験生", notes: "高校受験を目指す中学生向けの科目" },
  { name: "高校生", notes: "高校生向けの科目" },
  { name: "大学受験生", notes: "大学受験を目指す高校生向けの科目" },
  { name: "大人", notes: "大人向けの科目" },
];

const subjectSeeds = [
  { name: "国語" },
  { name: "算数" },
  { name: "数学" },
  { name: "英語" },
  { name: "理科" },
  { name: "社会" },
  { name: "書道" },
];

const subjectToSubjectTypeSeeds = [
  { subjectName: "国語", subjectTypeName: "小学生" },
  { subjectName: "国語", subjectTypeName: "中学受験生" },
  { subjectName: "国語", subjectTypeName: "中学生" },
  { subjectName: "国語", subjectTypeName: "高校受験生" },
  { subjectName: "国語", subjectTypeName: "高校生" },
  { subjectName: "国語", subjectTypeName: "大学受験生" },
  { subjectName: "国語", subjectTypeName: "大人" },
  { subjectName: "算数", subjectTypeName: "小学生" },
  { subjectName: "算数", subjectTypeName: "中学受験生" },
  { subjectName: "数学", subjectTypeName: "中学生" },
  { subjectName: "数学", subjectTypeName: "高校受験生" },
  { subjectName: "数学", subjectTypeName: "高校生" },
  { subjectName: "数学", subjectTypeName: "大学受験生" },
  { subjectName: "英語", subjectTypeName: "中学生" },
  { subjectName: "英語", subjectTypeName: "高校受験生" },
  { subjectName: "英語", subjectTypeName: "高校生" },
  { subjectName: "英語", subjectTypeName: "大学受験生" },
  { subjectName: "英語", subjectTypeName: "大人" },
  { subjectName: "理科", subjectTypeName: "小学生" },
  { subjectName: "理科", subjectTypeName: "中学受験生" },
  { subjectName: "理科", subjectTypeName: "中学生" },
  { subjectName: "理科", subjectTypeName: "高校受験生" },
  { subjectName: "社会", subjectTypeName: "小学生" },
  { subjectName: "社会", subjectTypeName: "中学受験生" },
  { subjectName: "社会", subjectTypeName: "中学生" },
  { subjectName: "社会", subjectTypeName: "高校受験生" },
  { subjectName: "社会", subjectTypeName: "高校生" },
  { subjectName: "社会", subjectTypeName: "大学受験生" },
  { subjectName: "書道", subjectTypeName: "中学生" },
  { subjectName: "書道", subjectTypeName: "高校生" },
  { subjectName: "書道", subjectTypeName: "大人" },
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
        passwordHash: hashSync("teacher123", 10),
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "佐藤 花子",
        email: "student@example.com",
        username: "STUDENT01",
        passwordHash: hashSync("student123", 10),
        role: UserRole.STUDENT,
      },
    }),
    prisma.user.create({
      data: {
        name: "鈴木 次郎",
        email: "teacher2@example.com",
        username: "TEACHER02",
        passwordHash: hashSync("teacher123", 10),
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "田中 三郎",
        email: "teacher3@example.com",
        username: "TEACHER03",
        passwordHash: hashSync("teacher123", 10),
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "高橋 健太",
        email: "student2@example.com",
        username: "STUDENT02",
        passwordHash: hashSync("student123", 10),
        role: UserRole.STUDENT,
      },
    }),
    prisma.user.create({
      data: {
        name: "伊藤 美咲",
        email: "student3@example.com",
        username: "STUDENT03",
        passwordHash: hashSync("student123", 10),
        role: UserRole.STUDENT,
      },
    }),
  ]);

  /* 2-a. StudentType */
  await prisma.studentType.createMany({
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
    data: subjectSeeds,
    skipDuplicates: true,
  });
  const [
    jpSubject,
    arithSubject,
    mathSubject,
    enSubject,
    sciSubject,
    socSubject,
    calSubject,
  ] = await prisma.subject.findMany({
    where: {
      name: { in: ["国語", "算数", "数学", "英語", "理科", "社会", "書道"] },
    },
  });

  /* 2-d. SubjectToSubjectType */
  const subjectMap = {
    国語: jpSubject.subjectId,
    算数: arithSubject.subjectId,
    数学: mathSubject.subjectId,
    英語: enSubject.subjectId,
    理科: sciSubject.subjectId,
    社会: socSubject.subjectId,
    書道: calSubject.subjectId,
  };

  await prisma.subjectToSubjectType.createMany({
    data: subjectToSubjectTypeSeeds.map((s) => ({
      subjectId: subjectMap[s.subjectName as keyof typeof subjectMap],
      subjectTypeId:
        subjectTypeMap[s.subjectTypeName as keyof typeof subjectTypeMap],
    })),
    skipDuplicates: true,
  });

  /* 2-e. ClassType */
  await prisma.classType.createMany({
    data: classTypeSeeds,
    skipDuplicates: true,
  });
  const normalClassType = await prisma.classType.findFirstOrThrow({
    where: { name: "通常授業" },
  });

  /* 2-f. Evaluation */
  await prisma.evaluation.createMany({
    data: evaluationSeeds,
    skipDuplicates: true,
  });
  const evalS = await prisma.evaluation.findFirstOrThrow({
    where: { name: "S" },
  });

  /* 2-g. Booth */
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
      {
        teacherId: teacher.teacherId,
        subjectId: jpSubject.subjectId,
        subjectTypeId: subjectTypeMap["高校生"],
      },
      {
        teacherId: teacher.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: subjectTypeMap["高校生"],
      },
      {
        teacherId: teacher2.teacherId,
        subjectId: enSubject.subjectId,
        subjectTypeId: subjectTypeMap["中学生"],
      },
      {
        teacherId: teacher2.teacherId,
        subjectId: calSubject.subjectId,
        subjectTypeId: subjectTypeMap["高校生"],
      },
      {
        teacherId: teacher3.teacherId,
        subjectId: arithSubject.subjectId,
        subjectTypeId: subjectTypeMap["小学生"],
      },
      {
        teacherId: teacher3.teacherId,
        subjectId: sciSubject.subjectId,
        subjectTypeId: subjectTypeMap["小学生"],
      },
    ],
    skipDuplicates: true,
  });

  /* 6. RegularClassTemplate (週次授業テンプレ) */
  const template = await prisma.regularClassTemplate.create({
    data: {
      classTypeId: normalClassType.classTypeId, // <-- added this line
      dayOfWeek: DayOfWeek.MONDAY,
      subjectId: mathSubject.subjectId,
      subjectTypeId: subjectTypeMap["高校生"],
      boothId: boothA.boothId,
      teacherId: teacher.teacherId,
      startTime: new Date("1970-01-01T15:00:00Z"),
      endTime: new Date("1970-01-01T16:30:00Z"),
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
      {
        teacherId: teacher2.teacherId,
        dayOfWeek: DayOfWeek.TUESDAY,
        startTime: new Date("1970-01-01T13:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        notes: "火曜午後在室",
      },
      {
        teacherId: teacher3.teacherId,
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T12:00:00Z"),
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
      subjectTypeId: subjectTypeMap["高校生"],
    },
  });
  await prisma.studentPreferenceTeacher.create({
    data: {
      studentPreferenceId: preference.preferenceId,
      teacherId: teacher.teacherId,
    },
  });

  const preference2 = await prisma.studentPreference.create({
    data: {
      studentId: student2.studentId,
      classTypeId: normalClassType.classTypeId,
      notes: "算数の基礎を強化したい",
    },
  });
  await prisma.studentPreferenceTimeSlot.create({
    data: {
      preferenceId: preference2.preferenceId,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: new Date("1970-01-01T14:00:00Z"),
      endTime: new Date("1970-01-01T15:30:00Z"),
    },
  });
  await prisma.studentPreferenceSubject.create({
    data: {
      studentPreferenceId: preference2.preferenceId,
      subjectId: arithSubject.subjectId,
      subjectTypeId: subjectTypeMap["小学生"],
    },
  });
  await prisma.studentPreferenceTeacher.create({
    data: {
      studentPreferenceId: preference2.preferenceId,
      teacherId: teacher3.teacherId,
    },
  });

  const preference3 = await prisma.studentPreference.create({
    data: {
      studentId: student3.studentId,
      classTypeId: normalClassType.classTypeId,
      notes: "英語の基礎を学びたい",
    },
  });
  await prisma.studentPreferenceTimeSlot.create({
    data: {
      preferenceId: preference3.preferenceId,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: new Date("1970-01-01T10:00:00Z"),
      endTime: new Date("1970-01-01T11:30:00Z"),
    },
  });
  await prisma.studentPreferenceSubject.create({
    data: {
      studentPreferenceId: preference3.preferenceId,
      subjectId: enSubject.subjectId,
      subjectTypeId: subjectTypeMap["中学生"],
    },
  });
  await prisma.studentPreferenceTeacher.create({
    data: {
      studentPreferenceId: preference3.preferenceId,
      teacherId: teacher2.teacherId,
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
      subjectTypeId: subjectTypeMap["高校生"],
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
      subjectTypeId: subjectTypeMap["高校生"],
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
      subjectTypeId: subjectTypeMap["高校生"],
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
