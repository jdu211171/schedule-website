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
  { name: "美術" },
  { name: "音楽" },
  { name: "体育" },
  { name: "情報" },
  { name: "家庭科" },
  { name: "技術" },
  { name: "地理" },
  { name: "歴史" },
  { name: "倫理" },
  { name: "現代文" },
  { name: "古典" },
  { name: "化学" },
  { name: "物理" },
  { name: "生物" },
  { name: "地学" },
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
  { subjectName: "美術", subjectTypeName: "小学生" },
  { subjectName: "美術", subjectTypeName: "中学生" },
  { subjectName: "美術", subjectTypeName: "高校生" },
  { subjectName: "音楽", subjectTypeName: "小学生" },
  { subjectName: "音楽", subjectTypeName: "中学生" },
  { subjectName: "音楽", subjectTypeName: "高校生" },
  { subjectName: "体育", subjectTypeName: "小学生" },
  { subjectName: "体育", subjectTypeName: "中学生" },
  { subjectName: "体育", subjectTypeName: "高校生" },
  { subjectName: "情報", subjectTypeName: "高校生" },
  { subjectName: "家庭科", subjectTypeName: "中学生" },
  { subjectName: "家庭科", subjectTypeName: "高校生" },
  { subjectName: "技術", subjectTypeName: "中学生" },
  { subjectName: "技術", subjectTypeName: "高校生" },
  { subjectName: "地理", subjectTypeName: "中学生" },
  { subjectName: "地理", subjectTypeName: "高校生" },
  { subjectName: "歴史", subjectTypeName: "中学生" },
  { subjectName: "歴史", subjectTypeName: "高校生" },
  { subjectName: "倫理", subjectTypeName: "高校生" },
  { subjectName: "現代文", subjectTypeName: "高校生" },
  { subjectName: "古典", subjectTypeName: "高校生" },
  { subjectName: "化学", subjectTypeName: "高校生" },
  { subjectName: "物理", subjectTypeName: "高校生" },
  { subjectName: "生物", subjectTypeName: "高校生" },
  { subjectName: "地学", subjectTypeName: "高校生" },
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
    teacherUser4,
    teacherUser5,
    teacherUser6,
    teacherUser7,
    teacherUser8,
    teacherUser9,
    teacherUser10,
    teacherUser11,
    teacherUser12,
    teacherUser13,
    teacherUser14,
    studentUser4,
    studentUser5,
    studentUser6,
    studentUser7,
    studentUser8,
    studentUser9,
    studentUser10,
    studentUser11,
    studentUser12,
    studentUser13,
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
        passwordHash: "student123",
        role: UserRole.STUDENT,
      },
    }),
    prisma.user.create({
      data: {
        name: "鈴木 次郎",
        email: "teacher2@example.com",
        username: "TEACHER02",
        passwordHash: "teacher123",
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
    prisma.user.create({
      data: {
        name: "佐々木 四郎",
        email: "teacher4@example.com",
        username: "TEACHER04",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "渡辺 五郎",
        email: "teacher5@example.com",
        username: "TEACHER05",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "小林 六美",
        email: "teacher6@example.com",
        username: "TEACHER06",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "加藤 七海",
        email: "teacher7@example.com",
        username: "TEACHER07",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "山本 八郎",
        email: "teacher8@example.com",
        username: "TEACHER08",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "中村 九子",
        email: "teacher9@example.com",
        username: "TEACHER09",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "松本 十郎",
        email: "teacher10@example.com",
        username: "TEACHER10",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "井上 十一美",
        email: "teacher11@example.com",
        username: "TEACHER11",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "木村 十二郎",
        email: "teacher12@example.com",
        username: "TEACHER12",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "林 十三子",
        email: "teacher13@example.com",
        username: "TEACHER13",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.create({
      data: {
        name: "斎藤 十四郎",
        email: "teacher14@example.com",
        username: "TEACHER14",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    // new student users
    prisma.user.create({ data: { name: "生徒4", email: "student4@example.com", username: "STUDENT04", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒5", email: "student5@example.com", username: "STUDENT05", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒6", email: "student6@example.com", username: "STUDENT06", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒7", email: "student7@example.com", username: "STUDENT07", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒8", email: "student8@example.com", username: "STUDENT08", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒9", email: "student9@example.com", username: "STUDENT09", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒10", email: "student10@example.com", username: "STUDENT10", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒11", email: "student11@example.com", username: "STUDENT11", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒12", email: "student12@example.com", username: "STUDENT12", passwordHash: "student123", role: UserRole.STUDENT } }),
    prisma.user.create({ data: { name: "生徒13", email: "student13@example.com", username: "STUDENT13", passwordHash: "student123", role: UserRole.STUDENT } }),
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
  const allSubjects = await prisma.subject.findMany({ where: {} });
  const subjectMap = Object.fromEntries(
    allSubjects.map((s) => [s.name, s.subjectId])
  );

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

  // 追加: 10人分のteacherレコード
  const teacherList = [
    { user: teacherUser4, name: "佐々木 四郎", birth: "1991-01-04", mobile: "080-0000-0004", email: "teacher4@example.com", highSchool: "都立南高校", university: "大阪大学", faculty: "法学部", department: "法律学科", status: "在籍" },
    { user: teacherUser5, name: "渡辺 五郎", birth: "1989-02-05", mobile: "080-0000-0005", email: "teacher5@example.com", highSchool: "都立北高校", university: "名古屋大学", faculty: "経済学部", department: "経済学科", status: "卒業" },
    { user: teacherUser6, name: "小林 六美", birth: "1993-03-06", mobile: "080-0000-0006", email: "teacher6@example.com", highSchool: "私立東高校", university: "神戸大学", faculty: "文学部", department: "英文学科", status: "在籍" },
    { user: teacherUser7, name: "加藤 七海", birth: "1990-04-07", mobile: "080-0000-0007", email: "teacher7@example.com", highSchool: "都立西高校", university: "北海道大学", faculty: "理学部", department: "数学科", status: "在籍" },
    { user: teacherUser8, name: "山本 八郎", birth: "1987-05-08", mobile: "080-0000-0008", email: "teacher8@example.com", highSchool: "都立南高校", university: "九州大学", faculty: "工学部", department: "機械工学科", status: "卒業" },
    { user: teacherUser9, name: "中村 九子", birth: "1992-06-09", mobile: "080-0000-0009", email: "teacher9@example.com", highSchool: "私立北高校", university: "筑波大学", faculty: "教育学部", department: "教育学科", status: "在籍" },
    { user: teacherUser10, name: "松本 十郎", birth: "1988-07-10", mobile: "080-0000-0010", email: "teacher10@example.com", highSchool: "都立東高校", university: "横浜国立大学", faculty: "経営学部", department: "経営学科", status: "卒業" },
    { user: teacherUser11, name: "井上 十一美", birth: "1994-08-11", mobile: "080-0000-0011", email: "teacher11@example.com", highSchool: "都立西高校", university: "広島大学", faculty: "理学部", department: "生物学科", status: "在籍" },
    { user: teacherUser12, name: "木村 十二郎", birth: "1991-09-12", mobile: "080-0000-0012", email: "teacher12@example.com", highSchool: "私立南高校", university: "金沢大学", faculty: "人間社会学域", department: "国際学類", status: "在籍" },
    { user: teacherUser13, name: "林 十三子", birth: "1990-10-13", mobile: "080-0000-0013", email: "teacher13@example.com", highSchool: "都立北高校", university: "岡山大学", faculty: "法学部", department: "法学科", status: "卒業" },
    { user: teacherUser14, name: "斎藤 十四郎", birth: "1986-11-14", mobile: "080-0000-0014", email: "teacher14@example.com", highSchool: "都立南高校", university: "新潟大学", faculty: "工学部", department: "電気電子工学科", status: "在籍" },
  ];
  const teacherRecords: Awaited<ReturnType<typeof prisma.teacher.create>>[] = [];
  for (const t of teacherList) {
    const rec = await prisma.teacher.create({
      data: {
        name: t.name,
        evaluationId: evalS.evaluationId,
        birthDate: new Date(`${t.birth}`),
        mobileNumber: t.mobile,
        email: t.email,
        highSchool: t.highSchool,
        university: t.university,
        faculty: t.faculty,
        department: t.department,
        enrollmentStatus: t.status,
        userId: t.user.id,
      },
    });
    teacherRecords.push(rec);
  }

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

  // 追加: 10名の生徒と希望条件
  const student4 = await prisma.student.create({ data: { userId: studentUser4.id, name: studentUser4.name!, birthDate: new Date("2012-01-10"), gradeId: gradeElem6.gradeId } });
  const pref4 = await prisma.studentPreference.create({ data: { studentId: student4.studentId } });
  // Pref4: only 国語
  await prisma.studentPreferenceSubject.create({ data: { studentPreferenceId: pref4.preferenceId, subjectId: subjectMap["国語"], subjectTypeId: subjectTypeMap["小学生"] } });

  const student5 = await prisma.student.create({ data: { userId: studentUser5.id, name: studentUser5.name!, birthDate: new Date("2012-02-15"), gradeId: gradeElem6.gradeId } });
  const pref5 = await prisma.studentPreference.create({ data: { studentId: student5.studentId } });
  await prisma.studentPreferenceTimeSlot.createMany({ data: [
    { preferenceId: pref5.preferenceId, dayOfWeek: DayOfWeek.MONDAY, startTime: new Date("1970-01-01T09:00:00Z"), endTime: new Date("1970-01-01T10:00:00Z") },
    { preferenceId: pref5.preferenceId, dayOfWeek: DayOfWeek.WEDNESDAY, startTime: new Date("1970-01-01T11:00:00Z"), endTime: new Date("1970-01-01T12:00:00Z") },
  ] });

  await prisma.student.create({ data: { userId: studentUser6.id, name: studentUser6.name!, birthDate: new Date("2012-03-20"), gradeId: gradeElem6.gradeId } });
  // No preferences for student6

  const student7 = await prisma.student.create({ data: { userId: studentUser7.id, name: studentUser7.name!, birthDate: new Date("2012-04-25"), gradeId: gradeElem6.gradeId } });
  const pref7 = await prisma.studentPreference.create({ data: { studentId: student7.studentId } });
  // Pref7: only 理科
  await prisma.studentPreferenceSubject.create({ data: { studentPreferenceId: pref7.preferenceId, subjectId: subjectMap["理科"], subjectTypeId: subjectTypeMap["小学生"] } });
  await prisma.studentPreferenceTimeSlot.create({ data: { preferenceId: pref7.preferenceId, dayOfWeek: DayOfWeek.TUESDAY, startTime: new Date("1970-01-01T13:00:00Z"), endTime: new Date("1970-01-01T14:00:00Z") } });

  await prisma.student.create({ data: { userId: studentUser8.id, name: studentUser8.name!, birthDate: new Date("2011-05-30"), gradeId: gradeMid3.gradeId } });
  // No preferences for student8

  const student9 = await prisma.student.create({ data: { userId: studentUser9.id, name: studentUser9.name!, birthDate: new Date("2011-06-05"), gradeId: gradeMid3.gradeId } });
  const pref9 = await prisma.studentPreference.create({ data: { studentId: student9.studentId } });
  // Pref9: only 美術
  await prisma.studentPreferenceSubject.create({ data: { studentPreferenceId: pref9.preferenceId, subjectId: subjectMap["美術"], subjectTypeId: subjectTypeMap["中学生"] } });

  const student10 = await prisma.student.create({ data: { userId: studentUser10.id, name: studentUser10.name!, birthDate: new Date("2010-07-10"), gradeId: gradeMid3.gradeId } });
  const pref10 = await prisma.studentPreference.create({ data: { studentId: student10.studentId } });
  await prisma.studentPreferenceTimeSlot.createMany({ data: [
    { preferenceId: pref10.preferenceId, dayOfWeek: DayOfWeek.FRIDAY, startTime: new Date("1970-01-01T15:00:00Z"), endTime: new Date("1970-01-01T16:00:00Z") },
  ] });

  const student11 = await prisma.student.create({
    data: {
      userId: studentUser11.id,
      name: studentUser11.name!,
      birthDate: new Date("2010-08-15"),
      gradeId: gradeHi3.gradeId,
    },
  });
  const pref11 = await prisma.studentPreference.create({ data: { studentId: student11.studentId } });
  await prisma.studentPreferenceSubject.create({ data: { studentPreferenceId: pref11.preferenceId, subjectId: subjectMap["数学"], subjectTypeId: subjectTypeMap["高校生"] } });
  await prisma.studentPreferenceTimeSlot.create({ data: { preferenceId: pref11.preferenceId, dayOfWeek: DayOfWeek.THURSDAY, startTime: new Date("1970-01-01T17:00:00Z"), endTime: new Date("1970-01-01T18:00:00Z") } });

  const student12 = await prisma.student.create({ data: { userId: studentUser12.id, name: studentUser12.name!, birthDate: new Date("2009-09-20"), gradeId: gradeHi3.gradeId } });
  // No preferences for student12

  const student13 = await prisma.student.create({ data: { userId: studentUser13.id, name: studentUser13.name!, birthDate: new Date("2009-10-25"), gradeId: gradeHi3.gradeId } });
  const pref13 = await prisma.studentPreference.create({ data: { studentId: student13.studentId } });
  await prisma.studentPreferenceTimeSlot.createMany({ data: [
    { preferenceId: pref13.preferenceId, dayOfWeek: DayOfWeek.WEDNESDAY, startTime: new Date("1970-01-01T12:00:00Z"), endTime: new Date("1970-01-01T13:00:00Z") },
    { preferenceId: pref13.preferenceId, dayOfWeek: DayOfWeek.FRIDAY, startTime: new Date("1970-01-01T14:30:00Z"), endTime: new Date("1970-01-01T15:30:00Z") },
  ] });

  /* 5. TeacherSubject (講師が教えられる科目) */
  await prisma.teacherSubject.createMany({
    data: [
      {
        teacherId: teacher.teacherId,
        subjectId: subjectMap["国語"],
        subjectTypeId: subjectTypeMap["高校生"],
      },
      {
        teacherId: teacher.teacherId,
        subjectId: subjectMap["数学"],
        subjectTypeId: subjectTypeMap["高校生"],
      },
      {
        teacherId: teacher2.teacherId,
        subjectId: subjectMap["英語"],
        subjectTypeId: subjectTypeMap["中学生"],
      },
      {
        teacherId: teacher2.teacherId,
        subjectId: subjectMap["書道"], // Assuming calSubject was 書道
        subjectTypeId: subjectTypeMap["高校生"],
      },
      {
        teacherId: teacher3.teacherId,
        subjectId: subjectMap["算数"], // Assuming arithSubject was 算数
        subjectTypeId: subjectTypeMap["小学生"],
      },
      {
        teacherId: teacher3.teacherId,
        subjectId: subjectMap["理科"], // Assuming sciSubject was 理科
        subjectTypeId: subjectTypeMap["小学生"],
      },
    ],
    skipDuplicates: true,
  });

  // 追加: 10人分のTeacherSubject（教えられる科目）
  const teacherSubjectData = [
    { teacherIdx: 0, subjectName: "国語", typeName: "小学生" },
    { teacherIdx: 1, subjectName: "数学", typeName: "高校生" },
    { teacherIdx: 2, subjectName: "英語", typeName: "中学生" },
    { teacherIdx: 3, subjectName: "理科", typeName: "高校受験生" },
    { teacherIdx: 4, subjectName: "社会", typeName: "大学受験生" },
    { teacherIdx: 5, subjectName: "書道", typeName: "大人" },
    { teacherIdx: 6, subjectName: "算数", typeName: "小学生" },
    { teacherIdx: 7, subjectName: "数学", typeName: "高校生" },
    { teacherIdx: 8, subjectName: "英語", typeName: "高校生" },
    { teacherIdx: 9, subjectName: "理科", typeName: "中学生" },
  ];
  await prisma.teacherSubject.createMany({
    data: teacherSubjectData.map((d) => ({
      teacherId: teacherRecords[d.teacherIdx].teacherId,
      subjectId: subjectMap[d.subjectName],
      subjectTypeId: subjectTypeMap[d.typeName],
    })),
    skipDuplicates: true,
  });

  /* 6. RegularClassTemplate (週次授業テンプレ) */
  const template = await prisma.regularClassTemplate.create({
    data: {
      classTypeId: normalClassType.classTypeId,
      dayOfWeek: DayOfWeek.MONDAY,
      subjectId: subjectMap["数学"],
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
      subjectId: subjectMap["数学"],
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
      subjectId: subjectMap["算数"],
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
      subjectId: subjectMap["英語"],
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
      subjectId: subjectMap["国語"],
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
  await prisma.classSession.create({
    data: {
      date: new Date("2025-05-12"),
      startTime: new Date("1970-01-01T15:00:00Z"),
      endTime: new Date("1970-01-01T16:30:00Z"),
      duration: new Date("1970-01-01T01:30:00Z"),
      teacherId: teacher.teacherId,
      studentId: student.studentId,
      subjectId: subjectMap["数学"],
      subjectTypeId: subjectTypeMap["高校生"],
      boothId: boothA.boothId,
      classTypeId: normalClassType.classTypeId,
      templateId: template.templateId,
      notes: "テンプレートから作成された通常授業",
    },
  });

  /* 13. Add a standalone class session (not from template) */
  await prisma.classSession.create({
    data: {
      date: new Date("2025-05-13"),
      startTime: new Date("1970-01-01T10:00:00Z"),
      endTime: new Date("1970-01-01T11:30:00Z"),
      duration: new Date("1970-01-01T01:30:00Z"),
      teacherId: teacher.teacherId,
      studentId: student.studentId,
      subjectId: subjectMap["数学"],
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
