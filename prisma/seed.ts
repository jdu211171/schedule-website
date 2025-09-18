import {
  PrismaClient,
  UserRole,
  DayOfWeek,
  AvailabilityType,
  AvailabilityStatus,
} from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

// Helper functions for dynamic date generation
const createTimeFromHour = (hour: number, minute: number = 0): Date => {
  return new Date(Date.UTC(2000, 0, 1, hour, minute, 0, 0));
};

const getRelativeDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const getRelativeDateUTC = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  );
};

async function main() {
  console.log("🌱  シード処理開始");
  // Helper: emulate upsert for ClassSession without a composite unique index
  // Looks up by (teacherId, date, startTime, endTime, isCancelled) and updates or creates accordingly.
  async function upsertClassSessionByKey(params: {
    where: {
      teacherId: string | null;
      date: Date;
      startTime: Date;
      endTime: Date;
      isCancelled: boolean;
    };
    update: any;
    create: any;
  }) {
    const existing = await prisma.classSession.findFirst({
      where: {
        teacherId: params.where.teacherId || undefined,
        date: params.where.date,
        startTime: params.where.startTime,
        endTime: params.where.endTime,
        isCancelled: params.where.isCancelled,
      },
      select: { classId: true },
    });

    if (existing) {
      return prisma.classSession.update({
        where: { classId: existing.classId },
        data: params.update,
      });
    }
    return prisma.classSession.create({ data: params.create });
  }

  /* ------------------------------------------------------------------
   * 1. 基本マスター
   * ----------------------------------------------------------------*/
  // 1‑a. Branch
  const mainBranch = await prisma.branch.create({
    data: {
      name: "川崎日航ホテルブース",
      notes: "デフォルト拠点",
      order: 1,
    },
  });

  const eastBranch = await prisma.branch.create({
    data: {
      name: "横浜",
      notes: "東側の分校",
      order: 2,
    },
  });

  const westBranch = await prisma.branch.create({
    data: {
      name: "上大岡",
      notes: "西側の分校",
      order: 3,
    },
  });

  // 1‑b. StudentType
  const generalStudentType = await prisma.studentType.create({
    data: {
      name: "小学生",
      maxYears: 6,
      description: "小学校に在籍する学生",
      order: 1,
    },
  });

  const middleStudentType = await prisma.studentType.create({
    data: {
      name: "中学生",
      maxYears: 3,
      description: "中学校に在籍する学生",
      order: 2,
    },
  });

  const highStudentType = await prisma.studentType.create({
    data: {
      name: "高校生",
      maxYears: 3,
      description: "高等学校に在籍する学生",
      order: 3,
    },
  });

  const otonaStudentType = await prisma.studentType.create({
    data: {
      name: "大人",
      maxYears: null,
      description: "成人学習者",
      order: 4,
    },
  });

  const adultStudentType = await prisma.studentType.create({
    data: {
      name: "社会人",
      maxYears: null,
      description: "社会人・成人学習者",
      order: 5,
    },
  });

  const rouninStudentType = await prisma.studentType.create({
    data: {
      name: "浪人生",
      maxYears: null,
      description: "進学準備中の学生（浪人生）",
      order: 6,
    },
  });

  // 1‑c. ClassType (idempotent without relying on null in composite unique)
  let regularClassType =
    (await prisma.classType.findFirst({
      where: { name: "通常授業", parentId: null },
    })) ||
    (await prisma.classType.create({
      data: { name: "通常授業", notes: "週次の通常授業枠", order: 1 },
    }));
  // Ensure notes/order are up to date
  regularClassType = await prisma.classType.update({
    where: { classTypeId: regularClassType.classTypeId },
    data: { notes: "週次の通常授業枠", order: 1, color: 'blue' },
  });

  let specialClassType =
    (await prisma.classType.findFirst({
      where: { name: "特別授業", parentId: null },
    })) ||
    (await prisma.classType.create({
      data: {
        name: "特別授業",
        notes: "夏期講習やイベントなどの特別枠",
        order: 2,
      },
    }));
  specialClassType = await prisma.classType.update({
    where: { classTypeId: specialClassType.classTypeId },
    data: { notes: "夏期講習やイベントなどの特別枠", order: 2, color: '#FDC5F5' },
  });

  let rescheduleClassType =
    (await prisma.classType.findFirst({
      where: { name: "振替授業", parentId: specialClassType.classTypeId },
    })) ||
    (await prisma.classType.create({
      data: {
        name: "振替授業",
        notes: "",
        parentId: specialClassType.classTypeId,
        order: 3,
      },
    }));
  rescheduleClassType = await prisma.classType.update({
    where: { classTypeId: rescheduleClassType.classTypeId },
    data: { notes: "", parentId: specialClassType.classTypeId, order: 3 },
  });

  let makeupClassType =
    (await prisma.classType.findFirst({
      where: { name: "補習授業", parentId: specialClassType.classTypeId },
    })) ||
    (await prisma.classType.create({
      data: {
        name: "補習授業",
        notes: "欠席者向けの補習授業",
        parentId: specialClassType.classTypeId,
        order: 4,
      },
    }));
  makeupClassType = await prisma.classType.update({
    where: { classTypeId: makeupClassType.classTypeId },
    data: {
      notes: "欠席者向けの補習授業",
      parentId: specialClassType.classTypeId,
      order: 4,
    },
  });

  let testPrepClassType =
    (await prisma.classType.findFirst({
      where: { name: "テスト対策", parentId: specialClassType.classTypeId },
    })) ||
    (await prisma.classType.create({
      data: {
        name: "テスト対策",
        notes: "定期テスト・入試対策授業",
        parentId: specialClassType.classTypeId,
        order: 5,
      },
    }));
  testPrepClassType = await prisma.classType.update({
    where: { classTypeId: testPrepClassType.classTypeId },
    data: {
      notes: "定期テスト・入試対策授業",
      parentId: specialClassType.classTypeId,
      order: 5,
    },
  });

  // Removed: dedicated "キャンセル" class type. Cancellation uses isCancelled flag.

  // 1‑d. Subject Types
  const elementarySubjectType = await prisma.subjectType.upsert({
    where: { name: "小学生" },
    update: { notes: "", order: 1 },
    create: {
      name: "小学生",
      notes: "",
      order: 1,
    },
  });

  const juniorExamSubjectType = await prisma.subjectType.upsert({
    where: { name: "中学受験生" },
    update: { notes: "", order: 2 },
    create: {
      name: "中学受験生",
      notes: "",
      order: 2,
    },
  });

  const juniorSubjectType = await prisma.subjectType.upsert({
    where: { name: "中学生" },
    update: { notes: "", order: 3 },
    create: {
      name: "中学生",
      notes: "",
      order: 3,
    },
  });

  const highExamSubjectType = await prisma.subjectType.upsert({
    where: { name: "高校受験生" },
    update: { notes: "", order: 4 },
    create: {
      name: "高校受験生",
      notes: "",
      order: 4,
    },
  });

  // 1‑e. Subjects
  const mathSubject = await prisma.subject.upsert({
    where: { name: "数学" },
    update: { notes: "算数・数学全般" },
    create: {
      name: "数学",
      notes: "算数・数学全般",
    },
  });

  const englishSubject = await prisma.subject.upsert({
    where: { name: "英語" },
    update: { notes: "英語全般" },
    create: {
      name: "英語",
      notes: "英語全般",
    },
  });

  const japaneseSubject = await prisma.subject.upsert({
    where: { name: "国語" },
    update: { notes: "現代文・古文・漢文" },
    create: {
      name: "国語",
      notes: "現代文・古文・漢文",
    },
  });

  const scienceSubject = await prisma.subject.upsert({
    where: { name: "理科" },
    update: { notes: "物理・化学・生物・地学" },
    create: {
      name: "理科",
      notes: "物理・化学・生物・地学",
    },
  });

  const socialSubject = await prisma.subject.upsert({
    where: { name: "社会" },
    update: { notes: "日本史・世界史・地理・公民" },
    create: {
      name: "社会",
      notes: "日本史・世界史・地理・公民",
    },
  });

  const programmingSubject = await prisma.subject.upsert({
    where: { name: "プログラミング" },
    update: { notes: "各種プログラミング言語" },
    create: {
      name: "プログラミング",
      notes: "各種プログラミング言語",
    },
  });

  const businessSubject = await prisma.subject.upsert({
    where: { name: "ビジネス" },
    update: { notes: "ビジネススキル・マナー" },
    create: {
      name: "ビジネス",
      notes: "ビジネススキル・マナー",
    },
  });

  // 1‑f. Booths
  // Main Branch Booths (Booth-1 to Booth-7)
  const booth1 = await prisma.booth.create({
    data: {
      name: "Booth‑1",
      branchId: mainBranch.branchId,
      notes: "",
      order: 1,
    },
  });

  const booth2 = await prisma.booth.create({
    data: {
      name: "Booth‑2",
      branchId: mainBranch.branchId,
      notes: "",
      order: 2,
    },
  });

  const booth3 = await prisma.booth.create({
    data: {
      name: "Booth‑3",
      branchId: mainBranch.branchId,
      notes: "",
      order: 3,
    },
  });

  const booth4 = await prisma.booth.create({
    data: {
      name: "Booth‑4",
      branchId: mainBranch.branchId,
      notes: "",
      order: 4,
    },
  });

  const booth5 = await prisma.booth.create({
    data: {
      name: "Booth‑5",
      branchId: mainBranch.branchId,
      notes: "",
      order: 5,
    },
  });

  const booth6 = await prisma.booth.create({
    data: {
      name: "Booth‑6",
      branchId: mainBranch.branchId,
      notes: "",
      order: 6,
    },
  });

  const booth7 = await prisma.booth.create({
    data: {
      name: "Booth‑7",
      branchId: mainBranch.branchId,
      notes: "",
      order: 7,
    },
  });

  // East Branch Booths (Booth-8 to Booth-14)
  const booth8 = await prisma.booth.create({
    data: {
      name: "Booth‑8",
      branchId: eastBranch.branchId,
      notes: "",
      order: 8,
    },
  });

  const booth9 = await prisma.booth.create({
    data: {
      name: "Booth‑9",
      branchId: eastBranch.branchId,
      notes: "",
      order: 9,
    },
  });

  const booth10 = await prisma.booth.create({
    data: {
      name: "Booth‑10",
      branchId: eastBranch.branchId,
      notes: "",
      order: 10,
    },
  });

  const booth11 = await prisma.booth.create({
    data: {
      name: "Booth‑11",
      branchId: eastBranch.branchId,
      notes: "",
      order: 11,
    },
  });

  const booth12 = await prisma.booth.create({
    data: {
      name: "Booth‑12",
      branchId: eastBranch.branchId,
      notes: "",
      order: 12,
    },
  });

  const booth13 = await prisma.booth.create({
    data: {
      name: "Booth‑13",
      branchId: eastBranch.branchId,
      notes: "",
      order: 13,
    },
  });

  const booth14 = await prisma.booth.create({
    data: {
      name: "Booth‑14",
      branchId: eastBranch.branchId,
      notes: "",
      order: 14,
    },
  });

  // West Branch Booths (Booth-15 to Booth-20)
  const booth15 = await prisma.booth.create({
    data: {
      name: "Booth‑15",
      branchId: westBranch.branchId,
      notes: "",
      order: 15,
    },
  });

  const booth16 = await prisma.booth.create({
    data: {
      name: "Booth‑16",
      branchId: westBranch.branchId,
      notes: "",
      order: 16,
    },
  });

  const booth17 = await prisma.booth.create({
    data: {
      name: "Booth‑17",
      branchId: westBranch.branchId,
      notes: "",
      order: 17,
    },
  });

  const booth18 = await prisma.booth.create({
    data: {
      name: "Booth‑18",
      branchId: westBranch.branchId,
      notes: "",
      order: 18,
    },
  });

  const booth19 = await prisma.booth.create({
    data: {
      name: "Booth‑19",
      branchId: westBranch.branchId,
      notes: "",
      order: 19,
    },
  });

  const booth20 = await prisma.booth.create({
    data: {
      name: "Booth‑20",
      branchId: westBranch.branchId,
      notes: "",
      order: 20,
    },
  });

  /* ------------------------------------------------------------------
   * 2. ユーザ & 権限
   * ----------------------------------------------------------------*/
  // Create admin user separately
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "管理者",
      email: "admin@example.com",
      username: "ADMIN01",
      passwordHash: hashSync("admin123"),
      role: UserRole.ADMIN,
      order: 1,
    },
  });

  // Create staff users
  const staffUser = await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      name: "鈴木 勇気",
      email: "staff@example.com",
      username: "STAFF01",
      passwordHash: hashSync("staff123"),
      role: UserRole.STAFF,
      order: 2,
    },
  });

  const staffUser2 = await prisma.user.upsert({
    where: { email: "staff2@example.com" },
    update: {},
    create: {
      name: "田中 美咲",
      email: "staff2@example.com",
      username: "STAFF02",
      passwordHash: hashSync("staff123"),
      role: UserRole.STAFF,
      order: 3,
    },
  });

  // Create teacher users
  const teacherUser1 = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      name: "山田 太郎",
      email: "teacher@example.com",
      username: "TEACHER01",
      passwordHash: "teacher123",
      role: UserRole.TEACHER,
      order: 4,
    },
  });

  const teacherUser2 = await prisma.user.upsert({
    where: { email: "teacher2@example.com" },
    update: {},
    create: {
      name: "佐々木 花子",
      email: "teacher2@example.com",
      username: "TEACHER02",
      passwordHash: "teacher123",
      role: UserRole.TEACHER,
      order: 5,
    },
  });

  const teacherUser3 = await prisma.user.upsert({
    where: { email: "teacher3@example.com" },
    update: {},
    create: {
      name: "高橋 誠",
      email: "teacher3@example.com",
      username: "TEACHER03",
      passwordHash: "teacher123",
      role: UserRole.TEACHER,
      order: 6,
    },
  });

  const teacherUser4 = await prisma.user.upsert({
    where: { email: "teacher4@example.com" },
    update: {},
    create: {
      name: "伊藤 理恵",
      email: "teacher4@example.com",
      username: "TEACHER04",
      passwordHash: "teacher123",
      role: UserRole.TEACHER,
      order: 7,
    },
  });

  const teacherUser5 = await prisma.user.upsert({
    where: { email: "teacher5@example.com" },
    update: {},
    create: {
      name: "松本 和也",
      email: "teacher5@example.com",
      username: "TEACHER05",
      passwordHash: "teacher123",
      role: UserRole.TEACHER,
      order: 8,
    },
  });

  // Create student users
  const studentUser1 = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      name: "佐藤 花子",
      email: "student@example.com",
      username: "STUDENT01",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 9,
    },
  });

  const studentUser2 = await prisma.user.upsert({
    where: { email: "student2@example.com" },
    update: {},
    create: {
      name: "田村 健太",
      email: "student2@example.com",
      username: "STUDENT02",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 10,
    },
  });

  const studentUser3 = await prisma.user.upsert({
    where: { email: "student3@example.com" },
    update: {},
    create: {
      name: "中島 愛美",
      email: "student3@example.com",
      username: "STUDENT03",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 11,
    },
  });

  const studentUser4 = await prisma.user.upsert({
    where: { email: "student4@example.com" },
    update: {},
    create: {
      name: "木村 大輔",
      email: "student4@example.com",
      username: "STUDENT04",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 12,
    },
  });

  const studentUser5 = await prisma.user.upsert({
    where: { email: "student5@example.com" },
    update: {},
    create: {
      name: "小林 由香",
      email: "student5@example.com",
      username: "STUDENT05",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 13,
    },
  });

  const studentUser6 = await prisma.user.upsert({
    where: { email: "student6@example.com" },
    update: {},
    create: {
      name: "渡辺 翔太",
      email: "student6@example.com",
      username: "STUDENT06",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 14,
    },
  });

  const studentUser7 = await prisma.user.upsert({
    where: { email: "student7@example.com" },
    update: {},
    create: {
      name: "加藤 美里",
      email: "student7@example.com",
      username: "STUDENT07",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 15,
    },
  });

  const studentUser8 = await prisma.user.upsert({
    where: { email: "student8@example.com" },
    update: {},
    create: {
      name: "吉田 拓海",
      email: "student8@example.com",
      username: "STUDENT08",
      passwordHash: "student123",
      role: UserRole.STUDENT,
      order: 16,
    },
  });

  // 2‑b. UserBranch (assign users to branches)
  await prisma.userBranch.createMany({
    data: [
      // Admin to all branches
      { userId: adminUser.id, branchId: mainBranch.branchId },
      { userId: adminUser.id, branchId: eastBranch.branchId },
      { userId: adminUser.id, branchId: westBranch.branchId },

      // Staff distributed across branches
      { userId: staffUser.id, branchId: mainBranch.branchId },
      { userId: staffUser2.id, branchId: eastBranch.branchId },

      // Teachers distributed across branches
      { userId: teacherUser1.id, branchId: mainBranch.branchId },
      { userId: teacherUser2.id, branchId: mainBranch.branchId },
      { userId: teacherUser3.id, branchId: eastBranch.branchId },
      { userId: teacherUser4.id, branchId: westBranch.branchId },
      { userId: teacherUser5.id, branchId: mainBranch.branchId },

      // Students distributed across branches
      { userId: studentUser1.id, branchId: mainBranch.branchId },
      { userId: studentUser2.id, branchId: mainBranch.branchId },
      { userId: studentUser3.id, branchId: eastBranch.branchId },
      { userId: studentUser4.id, branchId: eastBranch.branchId },
      { userId: studentUser5.id, branchId: westBranch.branchId },
      { userId: studentUser6.id, branchId: mainBranch.branchId },
      { userId: studentUser7.id, branchId: eastBranch.branchId },
      { userId: studentUser8.id, branchId: westBranch.branchId },
    ],
    skipDuplicates: true,
  });

  /* ------------------------------------------------------------------
   * 3. Teacher / Student エンティティ
   * ----------------------------------------------------------------*/
  const teacher1 = await prisma.teacher.upsert({
    where: { userId: teacherUser1.id },
    update: {},
    create: {
      userId: teacherUser1.id,
      name: teacherUser1.name!,
      kanaName: "ヤマダ タロウ",
      email: teacherUser1.email!,
      linkingCode: "T001",
      notes: "数学・理科専門",
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { userId: teacherUser2.id },
    update: {},
    create: {
      userId: teacherUser2.id,
      name: teacherUser2.name!,
      kanaName: "ササキ ハナコ",
      email: teacherUser2.email!,
      linkingCode: "T002",
      notes: "英語・国語専門",
    },
  });

  const teacher3 = await prisma.teacher.upsert({
    where: { userId: teacherUser3.id },
    update: {},
    create: {
      userId: teacherUser3.id,
      name: teacherUser3.name!,
      kanaName: "タカハシ マコト",
      email: teacherUser3.email!,
      linkingCode: "T003",
      notes: "社会・歴史専門",
    },
  });

  const teacher4 = await prisma.teacher.upsert({
    where: { userId: teacherUser4.id },
    update: {},
    create: {
      userId: teacherUser4.id,
      name: teacherUser4.name!,
      kanaName: "イトウ リエ",
      email: teacherUser4.email!,
      linkingCode: "T004",
      notes: "理科・化学専門",
    },
  });

  const teacher5 = await prisma.teacher.upsert({
    where: { userId: teacherUser5.id },
    update: {},
    create: {
      userId: teacherUser5.id,
      name: teacherUser5.name!,
      kanaName: "マツモト カズヤ",
      email: teacherUser5.email!,
      linkingCode: "T005",
      notes: "プログラミング・IT専門",
    },
  });

  // Students
  const student1 = await prisma.student.upsert({
    where: { userId: studentUser1.id },
    update: {},
    create: {
      userId: studentUser1.id,
      name: studentUser1.name!,
      kanaName: "サトウ ハナコ",
      studentTypeId: generalStudentType.studentTypeId,
      gradeYear: 5,
      linkingCode: "S001",
      notes: "算数が得意",
    },
  });

  const student2 = await prisma.student.upsert({
    where: { userId: studentUser2.id },
    update: {},
    create: {
      userId: studentUser2.id,
      name: studentUser2.name!,
      kanaName: "タムラ ケンタ",
      studentTypeId: middleStudentType.studentTypeId,
      gradeYear: 2,
      linkingCode: "S002",
      notes: "英語の強化が必要",
    },
  });

  const student3 = await prisma.student.upsert({
    where: { userId: studentUser3.id },
    update: {},
    create: {
      userId: studentUser3.id,
      name: studentUser3.name!,
      kanaName: "ナカジマ マナミ",
      studentTypeId: highStudentType.studentTypeId,
      gradeYear: 3,
      linkingCode: "S003",
      notes: "大学受験準備中",
    },
  });

  const student4 = await prisma.student.upsert({
    where: { userId: studentUser4.id },
    update: {},
    create: {
      userId: studentUser4.id,
      name: studentUser4.name!,
      kanaName: "キムラ ダイスケ",
      studentTypeId: middleStudentType.studentTypeId,
      gradeYear: 1,
      linkingCode: "S004",
      notes: "数学に興味あり",
    },
  });

  const student5 = await prisma.student.upsert({
    where: { userId: studentUser5.id },
    update: {},
    create: {
      userId: studentUser5.id,
      name: studentUser5.name!,
      kanaName: "コバヤシ ユカ",
      studentTypeId: adultStudentType.studentTypeId,
      gradeYear: null,
      linkingCode: "S005",
      notes: "転職のためのスキルアップ",
    },
  });

  const student6 = await prisma.student.upsert({
    where: { userId: studentUser6.id },
    update: {},
    create: {
      userId: studentUser6.id,
      name: studentUser6.name!,
      kanaName: "ワタナベ ショウタ",
      studentTypeId: generalStudentType.studentTypeId,
      gradeYear: 3,
      linkingCode: "S006",
      notes: "読書が好き",
    },
  });

  const student7 = await prisma.student.upsert({
    where: { userId: studentUser7.id },
    update: {},
    create: {
      userId: studentUser7.id,
      name: studentUser7.name!,
      kanaName: "カトウ ミサト",
      studentTypeId: highStudentType.studentTypeId,
      gradeYear: 1,
      linkingCode: "S007",
      notes: "理系志望",
    },
  });

  const student8 = await prisma.student.upsert({
    where: { userId: studentUser8.id },
    update: {},
    create: {
      userId: studentUser8.id,
      name: studentUser8.name!,
      kanaName: "ヨシダ タクミ",
      studentTypeId: rouninStudentType.studentTypeId,
      gradeYear: null,
      linkingCode: "S008",
      notes: "医学部志望",
    },
  });

  /* ------------------------------------------------------------------
   * 4. Subject Preferences
   * ----------------------------------------------------------------*/
  // User Subject Preferences
  await prisma.userSubjectPreference.createMany({
    data: [
      // Teacher 1 - Math and Science
      {
        userId: teacherUser1.id,
        subjectId: mathSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },
      {
        userId: teacherUser1.id,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },

      // Teacher 2 - English and Japanese
      {
        userId: teacherUser2.id,
        subjectId: englishSubject.subjectId,
        subjectTypeId: juniorSubjectType.subjectTypeId,
      },
      {
        userId: teacherUser2.id,
        subjectId: japaneseSubject.subjectId,
        subjectTypeId: juniorSubjectType.subjectTypeId,
      },

      // Teacher 3 - Social Studies
      {
        userId: teacherUser3.id,
        subjectId: socialSubject.subjectId,
        subjectTypeId: juniorSubjectType.subjectTypeId,
      },

      // Teacher 4 - Science
      {
        userId: teacherUser4.id,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: highExamSubjectType.subjectTypeId,
      },

      // Teacher 5 - Programming
      {
        userId: teacherUser5.id,
        subjectId: programmingSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },
      {
        userId: teacherUser5.id,
        subjectId: businessSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },
    ],
    skipDuplicates: true,
  });

  // Student Teacher Preferences
  await prisma.studentTeacherPreference.createMany({
    data: [
      // Student 1 (Elementary) prefers Teacher 1 for Math
      {
        studentId: student1.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },

      // Student 2 (Middle) prefers Teacher 2 for English
      {
        studentId: student2.studentId,
        teacherId: teacher2.teacherId,
        subjectId: englishSubject.subjectId,
        subjectTypeId: juniorSubjectType.subjectTypeId,
      },

      // Student 3 (High School) prefers Teacher 1 for Math and Teacher 4 for Science
      {
        studentId: student3.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: highExamSubjectType.subjectTypeId,
      },
      {
        studentId: student3.studentId,
        teacherId: teacher4.teacherId,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: highExamSubjectType.subjectTypeId,
      },

      // Student 4 (Middle) prefers Teacher 1 for Math
      {
        studentId: student4.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: juniorExamSubjectType.subjectTypeId,
      },

      // Student 5 (Adult) prefers Teacher 5 for Programming
      {
        studentId: student5.studentId,
        teacherId: teacher5.teacherId,
        subjectId: programmingSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },

      // Student 6 (Elementary) prefers Teacher 2 for Japanese
      {
        studentId: student6.studentId,
        teacherId: teacher2.teacherId,
        subjectId: japaneseSubject.subjectId,
        subjectTypeId: elementarySubjectType.subjectTypeId,
      },

      // Student 7 (High School) prefers Teacher 4 for Science
      {
        studentId: student7.studentId,
        teacherId: teacher4.teacherId,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: highExamSubjectType.subjectTypeId,
      },

      // Student 8 (Ronin) prefers multiple teachers for exam prep
      {
        studentId: student8.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: highExamSubjectType.subjectTypeId,
      },
      {
        studentId: student8.studentId,
        teacherId: teacher4.teacherId,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: highExamSubjectType.subjectTypeId,
      },
    ],
    skipDuplicates: true,
  });

  /* ------------------------------------------------------------------
   * 5. User Availability
   * ----------------------------------------------------------------*/
  // Teacher availability - regular weekly patterns
  const teacherAvailabilities = [
    // Teacher 1 - Available Monday to Friday 9:00-17:00
    {
      userId: teacherUser1.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },
    {
      userId: teacherUser1.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },
    {
      userId: teacherUser1.id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },
    {
      userId: teacherUser1.id,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },
    {
      userId: teacherUser1.id,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },

    // Teacher 2 - Available Tuesday to Saturday 10:00-18:00
    {
      userId: teacherUser2.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: createTimeFromHour(10),
      endTime: createTimeFromHour(18),
    },
    {
      userId: teacherUser2.id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: createTimeFromHour(10),
      endTime: createTimeFromHour(18),
    },
    {
      userId: teacherUser2.id,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: createTimeFromHour(10),
      endTime: createTimeFromHour(18),
    },
    {
      userId: teacherUser2.id,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: createTimeFromHour(10),
      endTime: createTimeFromHour(18),
    },
    {
      userId: teacherUser2.id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: createTimeFromHour(10),
      endTime: createTimeFromHour(18),
    },

    // Teacher 3 - Part-time, evenings
    {
      userId: teacherUser3.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: createTimeFromHour(18),
      endTime: createTimeFromHour(21),
    },
    {
      userId: teacherUser3.id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: createTimeFromHour(18),
      endTime: createTimeFromHour(21),
    },
    {
      userId: teacherUser3.id,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: createTimeFromHour(18),
      endTime: createTimeFromHour(21),
    },

    // Teacher 4 - Full availability
    {
      userId: teacherUser4.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: createTimeFromHour(8),
      endTime: createTimeFromHour(20),
    },
    {
      userId: teacherUser4.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: createTimeFromHour(8),
      endTime: createTimeFromHour(20),
    },
    {
      userId: teacherUser4.id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: createTimeFromHour(8),
      endTime: createTimeFromHour(20),
    },
    {
      userId: teacherUser4.id,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: createTimeFromHour(8),
      endTime: createTimeFromHour(20),
    },
    {
      userId: teacherUser4.id,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: createTimeFromHour(8),
      endTime: createTimeFromHour(20),
    },
    {
      userId: teacherUser4.id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: createTimeFromHour(8),
      endTime: createTimeFromHour(18),
    },

    // Teacher 5 - Weekends and evenings
    {
      userId: teacherUser5.id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: createTimeFromHour(18),
      endTime: createTimeFromHour(22),
    },
    {
      userId: teacherUser5.id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: createTimeFromHour(18),
      endTime: createTimeFromHour(22),
    },
    {
      userId: teacherUser5.id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },
    {
      userId: teacherUser5.id,
      dayOfWeek: DayOfWeek.SUNDAY,
      startTime: createTimeFromHour(9),
      endTime: createTimeFromHour(17),
    },
  ];

  await prisma.userAvailability.createMany({
    data: teacherAvailabilities.map((availability) => ({
      ...availability,
      type: AvailabilityType.REGULAR,
      status: AvailabilityStatus.APPROVED,
      notes: "定期勤務時間",
    })),
    skipDuplicates: true,
  });

  // Add some exception availabilities
  await prisma.userAvailability.createMany({
    data: [
      // Teacher 1 unavailable on specific date
      {
        userId: teacherUser1.id,
        date: getRelativeDateUTC(25),
        type: AvailabilityType.EXCEPTION,
        status: AvailabilityStatus.APPROVED,
        reason: "個人的な用事",
        notes: "この日は休暇",
        fullDay: true,
      },
      // Teacher 2 available extra hours on specific date
      {
        userId: teacherUser2.id,
        date: getRelativeDateUTC(30),
        startTime: createTimeFromHour(8),
        endTime: createTimeFromHour(20),
        type: AvailabilityType.EXCEPTION,
        status: AvailabilityStatus.APPROVED,
        reason: "夏期講習対応",
        notes: "特別対応日",
      },
    ],
    skipDuplicates: true,
  });

  /* ------------------------------------------------------------------
   * 6. 授業 (ClassSession) と関連テーブル
   * ----------------------------------------------------------------*/
  // Create multiple class sessions
  const classSession1 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher1.teacherId,
      date: getRelativeDateUTC(15),
      startTime: new Date(Date.UTC(
        getRelativeDate(15).getFullYear(),
        getRelativeDate(15).getMonth(),
        getRelativeDate(15).getDate(),
        9, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(15).getFullYear(),
        getRelativeDate(15).getMonth(),
        getRelativeDate(15).getDate(),
        10, 30, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student1.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth1.boothId,
      duration: 90,
      branchId: mainBranch.branchId,
      notes: "小学5年生 算数 分数の計算",
    },
    create: {
      teacherId: teacher1.teacherId,
      studentId: student1.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth1.boothId,
      date: getRelativeDateUTC(15),
      startTime: new Date(Date.UTC(
        getRelativeDate(15).getFullYear(),
        getRelativeDate(15).getMonth(),
        getRelativeDate(15).getDate(),
        9, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(15).getFullYear(),
        getRelativeDate(15).getMonth(),
        getRelativeDate(15).getDate(),
        10, 30, 0, 0
      )),
      duration: 90,
      branchId: mainBranch.branchId,
      notes: "小学5年生 算数 分数の計算",
    },
  });

  const classSession2 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher2.teacherId,
      date: getRelativeDateUTC(16),
      startTime: new Date(Date.UTC(
        getRelativeDate(16).getFullYear(),
        getRelativeDate(16).getMonth(),
        getRelativeDate(16).getDate(),
        14, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(16).getFullYear(),
        getRelativeDate(16).getMonth(),
        getRelativeDate(16).getDate(),
        15, 30, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student2.studentId,
      subjectId: englishSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth2.boothId,
      duration: 90,
      branchId: mainBranch.branchId,
      notes: "中2英語 現在完了形",
    },
    create: {
      teacherId: teacher2.teacherId,
      studentId: student2.studentId,
      subjectId: englishSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth2.boothId,
      date: getRelativeDateUTC(16),
      startTime: new Date(Date.UTC(
        getRelativeDate(16).getFullYear(),
        getRelativeDate(16).getMonth(),
        getRelativeDate(16).getDate(),
        14, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(16).getFullYear(),
        getRelativeDate(16).getMonth(),
        getRelativeDate(16).getDate(),
        15, 30, 0, 0
      )),
      duration: 90,
      branchId: mainBranch.branchId,
      notes: "中2英語 現在完了形",
    },
  });

  const classSession3 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher1.teacherId,
      date: getRelativeDateUTC(17),
      startTime: new Date(Date.UTC(
        getRelativeDate(17).getFullYear(),
        getRelativeDate(17).getMonth(),
        getRelativeDate(17).getDate(),
        16, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(17).getFullYear(),
        getRelativeDate(17).getMonth(),
        getRelativeDate(17).getDate(),
        18, 0, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student3.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: booth3.boothId,
      duration: 120,
      branchId: mainBranch.branchId,
      notes: "高3数学 大学受験対策 微分積分",
    },
    create: {
      teacherId: teacher1.teacherId,
      studentId: student3.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: booth3.boothId,
      date: getRelativeDateUTC(17),
      startTime: new Date(Date.UTC(
        getRelativeDate(17).getFullYear(),
        getRelativeDate(17).getMonth(),
        getRelativeDate(17).getDate(),
        16, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(17).getFullYear(),
        getRelativeDate(17).getMonth(),
        getRelativeDate(17).getDate(),
        18, 0, 0, 0
      )),
      duration: 120,
      branchId: mainBranch.branchId,
      notes: "高3数学 大学受験対策 微分積分",
    },
  });

  const classSession4 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher4.teacherId,
      date: getRelativeDateUTC(18),
      startTime: new Date(Date.UTC(
        getRelativeDate(18).getFullYear(),
        getRelativeDate(18).getMonth(),
        getRelativeDate(18).getDate(),
        10, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(18).getFullYear(),
        getRelativeDate(18).getMonth(),
        getRelativeDate(18).getDate(),
        12, 0, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student3.studentId,
      subjectId: scienceSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: booth8.boothId,
      duration: 120,
      branchId: eastBranch.branchId,
      notes: "高3化学 大学受験対策 有機化学",
    },
    create: {
      teacherId: teacher4.teacherId,
      studentId: student3.studentId,
      subjectId: scienceSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: booth8.boothId,
      date: getRelativeDateUTC(18),
      startTime: new Date(Date.UTC(
        getRelativeDate(18).getFullYear(),
        getRelativeDate(18).getMonth(),
        getRelativeDate(18).getDate(),
        10, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(18).getFullYear(),
        getRelativeDate(18).getMonth(),
        getRelativeDate(18).getDate(),
        12, 0, 0, 0
      )),
      duration: 120,
      branchId: eastBranch.branchId,
      notes: "高3化学 大学受験対策 有機化学",
    },
  });

  const classSession5 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher5.teacherId,
      date: getRelativeDateUTC(19),
      startTime: new Date(Date.UTC(
        getRelativeDate(19).getFullYear(),
        getRelativeDate(19).getMonth(),
        getRelativeDate(19).getDate(),
        19, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(19).getFullYear(),
        getRelativeDate(19).getMonth(),
        getRelativeDate(19).getDate(),
        21, 0, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student5.studentId,
      subjectId: programmingSubject.subjectId,
      classTypeId: specialClassType.classTypeId,
      boothId: booth15.boothId,
      duration: 120,
      branchId: westBranch.branchId,
      notes: "JavaScript基礎 社会人向け",
    },
    create: {
      teacherId: teacher5.teacherId,
      studentId: student5.studentId,
      subjectId: programmingSubject.subjectId,
      classTypeId: specialClassType.classTypeId,
      boothId: booth15.boothId,
      date: getRelativeDateUTC(19),
      startTime: new Date(Date.UTC(
        getRelativeDate(19).getFullYear(),
        getRelativeDate(19).getMonth(),
        getRelativeDate(19).getDate(),
        19, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(19).getFullYear(),
        getRelativeDate(19).getMonth(),
        getRelativeDate(19).getDate(),
        21, 0, 0, 0
      )),
      duration: 120,
      branchId: westBranch.branchId,
      notes: "JavaScript基礎 社会人向け",
    },
  });

  const classSession6 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher2.teacherId,
      date: getRelativeDateUTC(20),
      startTime: new Date(Date.UTC(
        getRelativeDate(20).getFullYear(),
        getRelativeDate(20).getMonth(),
        getRelativeDate(20).getDate(),
        11, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(20).getFullYear(),
        getRelativeDate(20).getMonth(),
        getRelativeDate(20).getDate(),
        12, 0, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student6.studentId,
      subjectId: japaneseSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth4.boothId,
      duration: 60,
      branchId: mainBranch.branchId,
      notes: "小3国語 音読練習",
    },
    create: {
      teacherId: teacher2.teacherId,
      studentId: student6.studentId,
      subjectId: japaneseSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth4.boothId,
      date: getRelativeDateUTC(20),
      startTime: new Date(Date.UTC(
        getRelativeDate(20).getFullYear(),
        getRelativeDate(20).getMonth(),
        getRelativeDate(20).getDate(),
        11, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(20).getFullYear(),
        getRelativeDate(20).getMonth(),
        getRelativeDate(20).getDate(),
        12, 0, 0, 0
      )),
      duration: 60,
      branchId: mainBranch.branchId,
      notes: "小3国語 音読練習",
    },
  });

  const classSession7 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher4.teacherId,
      date: getRelativeDateUTC(21),
      startTime: new Date(Date.UTC(
        getRelativeDate(21).getFullYear(),
        getRelativeDate(21).getMonth(),
        getRelativeDate(21).getDate(),
        15, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(21).getFullYear(),
        getRelativeDate(21).getMonth(),
        getRelativeDate(21).getDate(),
        16, 30, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student7.studentId,
      subjectId: scienceSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth9.boothId,
      duration: 90,
      branchId: eastBranch.branchId,
      notes: "高1物理 力学の基礎",
    },
    create: {
      teacherId: teacher4.teacherId,
      studentId: student7.studentId,
      subjectId: scienceSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: booth9.boothId,
      date: getRelativeDateUTC(21),
      startTime: new Date(Date.UTC(
        getRelativeDate(21).getFullYear(),
        getRelativeDate(21).getMonth(),
        getRelativeDate(21).getDate(),
        15, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(21).getFullYear(),
        getRelativeDate(21).getMonth(),
        getRelativeDate(21).getDate(),
        16, 30, 0, 0
      )),
      duration: 90,
      branchId: eastBranch.branchId,
      notes: "高1物理 力学の基礎",
    },
  });

  const classSession8 = await upsertClassSessionByKey({
    where: {
      teacherId: teacher1.teacherId,
      date: getRelativeDateUTC(22),
      startTime: new Date(Date.UTC(
        getRelativeDate(22).getFullYear(),
        getRelativeDate(22).getMonth(),
        getRelativeDate(22).getDate(),
        9, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(22).getFullYear(),
        getRelativeDate(22).getMonth(),
        getRelativeDate(22).getDate(),
        12, 0, 0, 0
      )),
      isCancelled: false,
    },
    update: {
      studentId: student8.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: booth5.boothId,
      duration: 180,
      branchId: mainBranch.branchId,
      notes: "浪人生数学 医学部受験対策",
    },
    create: {
      teacherId: teacher1.teacherId,
      studentId: student8.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: booth5.boothId,
      date: getRelativeDateUTC(22),
      startTime: new Date(Date.UTC(
        getRelativeDate(22).getFullYear(),
        getRelativeDate(22).getMonth(),
        getRelativeDate(22).getDate(),
        9, 0, 0, 0
      )),
      endTime: new Date(Date.UTC(
        getRelativeDate(22).getFullYear(),
        getRelativeDate(22).getMonth(),
        getRelativeDate(22).getDate(),
        12, 0, 0, 0
      )),
      duration: 180,
      branchId: mainBranch.branchId,
      notes: "浪人生数学 医学部受験対策",
    },
  });

  // Student Class Enrollments
  const enrollments = [
    {
      classId: classSession1.classId,
      studentId: student1.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession2.classId,
      studentId: student2.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession3.classId,
      studentId: student3.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession4.classId,
      studentId: student3.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession5.classId,
      studentId: student5.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession6.classId,
      studentId: student6.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession7.classId,
      studentId: student7.studentId,
      status: "Confirmed",
    },
    {
      classId: classSession8.classId,
      studentId: student8.studentId,
      status: "Confirmed",
    },
  ];

  for (const enrollment of enrollments) {
    await prisma.studentClassEnrollment.create({
      data: enrollment,
    });
  }

  // Seed past class sessions (1–6 months before today) and enroll the student
  const createPastSession = async (
    monthsAgo: number,
    startHourUTC: number,
    endHourUTC: number,
    notes: string,
  ) => {
    const today = new Date();
    // Base date at midnight UTC today
    const baseDateUTC = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    // Move back by N months, preserving day-of-month when possible
    baseDateUTC.setUTCMonth(baseDateUTC.getUTCMonth() - monthsAgo);

    const start = new Date(
      Date.UTC(
        baseDateUTC.getUTCFullYear(),
        baseDateUTC.getUTCMonth(),
        baseDateUTC.getUTCDate(),
        startHourUTC,
        0,
        0,
        0,
      ),
    );
    const end = new Date(
      Date.UTC(
        baseDateUTC.getUTCFullYear(),
        baseDateUTC.getUTCMonth(),
        baseDateUTC.getUTCDate(),
        endHourUTC,
        0,
        0,
        0,
      ),
    );

    const session = await prisma.classSession.create({
      data: {
        teacherId: teacher1.teacherId,
        studentId: student1.studentId,
        subjectId: mathSubject.subjectId,
        classTypeId: regularClassType.classTypeId,
        boothId: booth1.boothId,
        branchId: mainBranch.branchId,
        date: baseDateUTC,
        startTime: start,
        endTime: end,
        duration: (endHourUTC - startHourUTC) * 60,
        notes,
      },
    });

    await prisma.studentClassEnrollment.create({
      data: {
        classId: session.classId,
        studentId: student1.studentId,
        status: "Confirmed",
      },
    });
  };

  await createPastSession(1, 10, 11, "過去レッスン（1ヶ月前）");
  await createPastSession(2, 10, 11, "過去レッスン（2ヶ月前）");
  await createPastSession(3, 10, 11, "過去レッスン（3ヶ月前）");
  await createPastSession(4, 10, 11, "過去レッスン（4ヶ月前）");
  await createPastSession(5, 10, 11, "過去レッスン（5ヶ月前）");
  await createPastSession(6, 10, 11, "過去レッスン（6ヶ月前）");

  // --- Class Series (blueprint) seeding helpers and data ---
  const enumerateDatesBetween = (startDate: Date, endDate: Date, daysOfWeek: number[]) => {
    const out: Date[] = [];
    const daySet = new Set(daysOfWeek.map((d) => ((d % 7) + 7) % 7));
    const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 0, 0, 0, 0));
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 24 * 3600 * 1000)) {
      if (daySet.has(d.getUTCDay())) out.push(new Date(d));
    }
    return out;
  };

  const nextDaysUTC = (n: number) => {
    const t = new Date();
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, 0, 0, 0));
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };

  async function createSeriesWithSessions(params: {
    seriesId: string;
    studentId: string;
    teacherId: string;
    subjectId: string | null;
    classTypeId: string; // regular only
    branchId: string | null;
    boothId: string | null;
    startDate: Date; // date-only UTC
    endDate: Date;   // date-only UTC
    startTime: Date; // time-only UTC
    endTime: Date;   // time-only UTC
    daysOfWeek: number[]; // 0..6
    notes?: string | null;
  }) {
    const duration = Math.round((params.endTime.getTime() - params.startTime.getTime()) / 60000);

    await prisma.classSeries.upsert({
      where: { seriesId: params.seriesId },
      update: {
        branchId: params.branchId,
        teacherId: params.teacherId,
        studentId: params.studentId,
        subjectId: params.subjectId,
        classTypeId: params.classTypeId,
        boothId: params.boothId,
        startDate: params.startDate,
        endDate: params.endDate,
        startTime: params.startTime,
        endTime: params.endTime,
        duration,
        daysOfWeek: params.daysOfWeek as any,
        status: 'ACTIVE',
        generationMode: 'ON_DEMAND',
        lastGeneratedThrough: params.endDate,
        notes: params.notes ?? null,
      },
      create: {
        seriesId: params.seriesId,
        branchId: params.branchId,
        teacherId: params.teacherId,
        studentId: params.studentId,
        subjectId: params.subjectId,
        classTypeId: params.classTypeId,
        boothId: params.boothId,
        startDate: params.startDate,
        endDate: params.endDate,
        startTime: params.startTime,
        endTime: params.endTime,
        duration,
        daysOfWeek: params.daysOfWeek as any,
        status: 'ACTIVE',
        generationMode: 'ON_DEMAND',
        lastGeneratedThrough: params.endDate,
        notes: params.notes ?? null,
      },
    });

    const dates = enumerateDatesBetween(params.startDate, params.endDate, params.daysOfWeek);
    if (dates.length) {
      await prisma.classSession.createMany({
        data: dates.map((d) => ({
          seriesId: params.seriesId,
          teacherId: params.teacherId,
          studentId: params.studentId,
          subjectId: params.subjectId,
          classTypeId: params.classTypeId,
          boothId: params.boothId,
          branchId: params.branchId,
          date: d,
          startTime: params.startTime,
          endTime: params.endTime,
          duration,
          isCancelled: false,
          notes: params.notes ?? null,
          status: 'CONFIRMED',
        })),
        skipDuplicates: true,
      });
    }
  }

  // Seed two regular series for visibility in UI
  await createSeriesWithSessions({
    seriesId: 'SEED_SERIES_S1_MATH_MWF',
    studentId: student1.studentId,
    teacherId: teacher1.teacherId,
    subjectId: mathSubject.subjectId,
    classTypeId: regularClassType.classTypeId,
    branchId: mainBranch.branchId,
    boothId: booth1.boothId,
    startDate: nextDaysUTC(0),
    endDate: nextDaysUTC(42),
    startTime: createTimeFromHour(16, 0),
    endTime: createTimeFromHour(16, 50),
    daysOfWeek: [1, 3, 5],
    notes: 'seed series: math M/W/F',
  });

  await createSeriesWithSessions({
    seriesId: 'SEED_SERIES_S2_ENG_TT',
    studentId: student2.studentId,
    teacherId: teacher2.teacherId,
    subjectId: englishSubject.subjectId,
    classTypeId: regularClassType.classTypeId,
    branchId: mainBranch.branchId,
    boothId: booth1.boothId,
    startDate: nextDaysUTC(0),
    endDate: nextDaysUTC(42),
    startTime: createTimeFromHour(18, 0),
    endTime: createTimeFromHour(18, 50),
    daysOfWeek: [2, 4],
    notes: 'seed series: english T/Th',
  });

  // Vacations and Holidays
  const vacations = [
    // Main Branch Vacations
    {
      name: "夏期休暇",
      startDate: getRelativeDateUTC(60),
      endDate: getRelativeDateUTC(70),
      isRecurring: false,
      branchId: mainBranch.branchId,
      notes: "川崎日航ホテルブース 夏期休暇",
      order: 1,
    },
    {
      name: "お盆休み",
      startDate: getRelativeDateUTC(63),
      endDate: getRelativeDateUTC(66),
      isRecurring: true,
      branchId: mainBranch.branchId,
      notes: "毎年恒例のお盆休み",
      order: 2,
    },
    {
      name: "年末年始休暇",
      startDate: getRelativeDateUTC(180),
      endDate: getRelativeDateUTC(185),
      isRecurring: true,
      branchId: mainBranch.branchId,
      notes: "年末年始休暇",
      order: 3,
    },
    {
      name: "ゴールデンウィーク",
      startDate: getRelativeDateUTC(100),
      endDate: getRelativeDateUTC(106),
      isRecurring: true,
      branchId: mainBranch.branchId,
      notes: "ゴールデンウィーク休暇",
      order: 5,
    },

    // East Branch (Yokohama) Vacations
    {
      name: "横浜メンテナンス日",
      startDate: getRelativeDateUTC(45),
      endDate: getRelativeDateUTC(45),
      isRecurring: false,
      branchId: eastBranch.branchId,
      notes: "設備メンテナンスのため横浜のみ休校",
      order: 4,
    },
    {
      name: "お盆休み",
      startDate: getRelativeDateUTC(63),
      endDate: getRelativeDateUTC(66),
      isRecurring: true,
      branchId: eastBranch.branchId,
      notes: "毎年恒例のお盆休み",
      order: 2,
    },
    {
      name: "年末年始休暇",
      startDate: getRelativeDateUTC(180),
      endDate: getRelativeDateUTC(185),
      isRecurring: true,
      branchId: eastBranch.branchId,
      notes: "年末年始休暇",
      order: 3,
    },
    {
      name: "ゴールデンウィーク",
      startDate: getRelativeDateUTC(100),
      endDate: getRelativeDateUTC(106),
      isRecurring: true,
      branchId: eastBranch.branchId,
      notes: "ゴールデンウィーク休暇",
      order: 5,
    },

    // West Branch (Kamiooka) Vacations
    {
      name: "お盆休み",
      startDate: getRelativeDateUTC(63),
      endDate: getRelativeDateUTC(66),
      isRecurring: true,
      branchId: westBranch.branchId,
      notes: "毎年恒例のお盆休み",
      order: 2,
    },
    {
      name: "年末年始休暇",
      startDate: getRelativeDateUTC(180),
      endDate: getRelativeDateUTC(185),
      isRecurring: true,
      branchId: westBranch.branchId,
      notes: "年末年始休暇",
      order: 3,
    },
    {
      name: "ゴールデンウィーク",
      startDate: getRelativeDateUTC(100),
      endDate: getRelativeDateUTC(106),
      isRecurring: true,
      branchId: westBranch.branchId,
      notes: "ゴールデンウィーク休暇",
      order: 5,
    },
  ];

  for (const vacation of vacations) {
    await prisma.vacation.create({
      data: vacation,
    });
  }

  console.log("✅  シード完了");

  // Log summary
  console.log("📊  作成されたデータ:");
  console.log(`   • Branches: 3`);
  console.log(`   • Booths: 20`);
  console.log(`   • Student Types: 6`);
  console.log(`   • Class Types: 5`);
  console.log(`   • Subject Types: 4`);
  console.log(`   • Subjects: 7`);
  console.log(`   • Users: 16`);
  console.log(`   • Teachers: 5`);
  console.log(`   • Students: 8`);
  console.log(`   • Class Sessions: 14`);
  console.log(`   • User Availabilities: ${teacherAvailabilities.length + 2}`);
  console.log(`   • Vacations: ${vacations.length}`);
}

main()
  .catch((e) => {
    console.error("❌  シード失敗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
