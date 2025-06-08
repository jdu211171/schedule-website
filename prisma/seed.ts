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
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
};

async function main() {
  console.log("🌱  シード処理開始");

  /* ------------------------------------------------------------------
   * 1. 基本マスター
   * ----------------------------------------------------------------*/
  // 1‑a. Branch
  const mainBranch = await prisma.branch.create({
    data: {
      name: "本校",
      notes: "デフォルト拠点",
      order: 1,
    },
  });

  const eastBranch = await prisma.branch.create({
    data: {
      name: "東校",
      notes: "東側の分校",
      order: 2,
    },
  });

  const westBranch = await prisma.branch.create({
    data: {
      name: "西校",
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

  // 1‑c. ClassType
  const regularClassType = await prisma.classType.create({
    data: {
      name: "通常授業",
      notes: "週次の通常授業枠",
    },
  });

  const specialClassType = await prisma.classType.create({
    data: {
      name: "特別授業",
      notes: "夏期講習やイベントなどの特別枠",
    },
  });

  const testPrepClassType = await prisma.classType.create({
    data: {
      name: "テスト対策",
      notes: "定期テスト・入試対策授業",
    },
  });

  const makeupClassType = await prisma.classType.create({
    data: {
      name: "補習授業",
      notes: "欠席者向けの補習授業",
    },
  });

  // 1‑d. Subject Types
  const academicSubjectType = await prisma.subjectType.create({
    data: {
      name: "学科",
      notes: "主要な学科科目",
      order: 1,
    },
  });

  const skillSubjectType = await prisma.subjectType.create({
    data: {
      name: "技能",
      notes: "技能系科目",
      order: 2,
    },
  });

  const testPrepSubjectType = await prisma.subjectType.create({
    data: {
      name: "受験対策",
      notes: "受験・試験対策科目",
      order: 3,
    },
  });

  // 1‑e. Subjects
  const mathSubject = await prisma.subject.create({
    data: {
      name: "数学",
      notes: "算数・数学全般",
    },
  });

  const englishSubject = await prisma.subject.create({
    data: {
      name: "英語",
      notes: "英語全般",
    },
  });

  const japaneseSubject = await prisma.subject.create({
    data: {
      name: "国語",
      notes: "現代文・古文・漢文",
    },
  });

  const scienceSubject = await prisma.subject.create({
    data: {
      name: "理科",
      notes: "物理・化学・生物・地学",
    },
  });

  const socialSubject = await prisma.subject.create({
    data: {
      name: "社会",
      notes: "日本史・世界史・地理・公民",
    },
  });

  const programmingSubject = await prisma.subject.create({
    data: {
      name: "プログラミング",
      notes: "各種プログラミング言語",
    },
  });

  const businessSubject = await prisma.subject.create({
    data: {
      name: "ビジネス",
      notes: "ビジネススキル・マナー",
    },
  });

  // 1‑f. Booths
  const boothA = await prisma.booth.create({
    data: {
      name: "Booth‑A",
      branchId: mainBranch.branchId,
      notes: "1F 奥側",
      order: 1,
    },
  });

  const boothB = await prisma.booth.create({
    data: {
      name: "Booth‑B",
      branchId: mainBranch.branchId,
      notes: "1F 手前側",
      order: 2,
    },
  });

  const boothC = await prisma.booth.create({
    data: {
      name: "Booth‑C",
      branchId: mainBranch.branchId,
      notes: "2F 大教室",
      order: 3,
    },
  });

  // East Branch Booths
  const eastBoothA = await prisma.booth.create({
    data: {
      name: "East‑A",
      branchId: eastBranch.branchId,
      notes: "東校 個別指導室A",
      order: 1,
    },
  });

  const eastBoothB = await prisma.booth.create({
    data: {
      name: "East‑B",
      branchId: eastBranch.branchId,
      notes: "東校 個別指導室B",
      order: 2,
    },
  });

  // West Branch Booths
  const westBoothA = await prisma.booth.create({
    data: {
      name: "West‑A",
      branchId: westBranch.branchId,
      notes: "西校 指導室A",
      order: 1,
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
      lineId: "yamada_taro_line",
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
      lineId: "sasaki_hanako_line",
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
      lineId: "takahashi_makoto_line",
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
      lineId: "ito_rie_line",
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
      lineId: "matsumoto_kazuya_line",
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
      lineId: "sato_hanako_line",
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
      lineId: "tamura_kenta_line",
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
      lineId: "nakajima_manami_line",
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
      lineId: "kimura_daisuke_line",
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
      lineId: "kobayashi_yuka_line",
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
      lineId: "watanabe_shota_line",
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
      lineId: "kato_misato_line",
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
      lineId: "yoshida_takumi_line",
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
        subjectTypeId: academicSubjectType.subjectTypeId,
      },
      {
        userId: teacherUser1.id,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Teacher 2 - English and Japanese
      {
        userId: teacherUser2.id,
        subjectId: englishSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },
      {
        userId: teacherUser2.id,
        subjectId: japaneseSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Teacher 3 - Social Studies
      {
        userId: teacherUser3.id,
        subjectId: socialSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Teacher 4 - Science
      {
        userId: teacherUser4.id,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Teacher 5 - Programming
      {
        userId: teacherUser5.id,
        subjectId: programmingSubject.subjectId,
        subjectTypeId: skillSubjectType.subjectTypeId,
      },
      {
        userId: teacherUser5.id,
        subjectId: businessSubject.subjectId,
        subjectTypeId: skillSubjectType.subjectTypeId,
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
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Student 2 (Middle) prefers Teacher 2 for English
      {
        studentId: student2.studentId,
        teacherId: teacher2.teacherId,
        subjectId: englishSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Student 3 (High School) prefers Teacher 1 for Math and Teacher 4 for Science
      {
        studentId: student3.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: testPrepSubjectType.subjectTypeId,
      },
      {
        studentId: student3.studentId,
        teacherId: teacher4.teacherId,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: testPrepSubjectType.subjectTypeId,
      },

      // Student 4 (Middle) prefers Teacher 1 for Math
      {
        studentId: student4.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Student 5 (Adult) prefers Teacher 5 for Programming
      {
        studentId: student5.studentId,
        teacherId: teacher5.teacherId,
        subjectId: programmingSubject.subjectId,
        subjectTypeId: skillSubjectType.subjectTypeId,
      },

      // Student 6 (Elementary) prefers Teacher 2 for Japanese
      {
        studentId: student6.studentId,
        teacherId: teacher2.teacherId,
        subjectId: japaneseSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Student 7 (High School) prefers Teacher 4 for Science
      {
        studentId: student7.studentId,
        teacherId: teacher4.teacherId,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: academicSubjectType.subjectTypeId,
      },

      // Student 8 (Ronin) prefers multiple teachers for exam prep
      {
        studentId: student8.studentId,
        teacherId: teacher1.teacherId,
        subjectId: mathSubject.subjectId,
        subjectTypeId: testPrepSubjectType.subjectTypeId,
      },
      {
        studentId: student8.studentId,
        teacherId: teacher4.teacherId,
        subjectId: scienceSubject.subjectId,
        subjectTypeId: testPrepSubjectType.subjectTypeId,
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

  for (const availability of teacherAvailabilities) {
    await prisma.userAvailability.create({
      data: {
        ...availability,
        type: AvailabilityType.REGULAR,
        status: AvailabilityStatus.APPROVED,
        notes: "定期勤務時間",
      },
    });
  }

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
  });

  /* ------------------------------------------------------------------
   * 6. 授業 (ClassSession) と関連テーブル
   * ----------------------------------------------------------------*/
  // Create multiple class sessions
  const classSession1 = await prisma.classSession.create({
    data: {
      teacherId: teacher1.teacherId,
      studentId: student1.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: boothA.boothId,
      date: getRelativeDateUTC(15),
      startTime: new Date(Date.UTC(getRelativeDate(15).getFullYear(), getRelativeDate(15).getMonth(), getRelativeDate(15).getDate(), 9, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(15).getFullYear(), getRelativeDate(15).getMonth(), getRelativeDate(15).getDate(), 10, 30, 0, 0)),
      duration: 90,
      branchId: mainBranch.branchId,
      notes: "小学5年生 算数 分数の計算",
    },
  });

  const classSession2 = await prisma.classSession.create({
    data: {
      teacherId: teacher2.teacherId,
      studentId: student2.studentId,
      subjectId: englishSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: boothB.boothId,
      date: getRelativeDateUTC(16),
      startTime: new Date(Date.UTC(getRelativeDate(16).getFullYear(), getRelativeDate(16).getMonth(), getRelativeDate(16).getDate(), 14, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(16).getFullYear(), getRelativeDate(16).getMonth(), getRelativeDate(16).getDate(), 15, 30, 0, 0)),
      duration: 90,
      branchId: mainBranch.branchId,
      notes: "中2英語 現在完了形",
    },
  });

  const classSession3 = await prisma.classSession.create({
    data: {
      teacherId: teacher1.teacherId,
      studentId: student3.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: boothC.boothId,
      date: getRelativeDateUTC(17),
      startTime: new Date(Date.UTC(getRelativeDate(17).getFullYear(), getRelativeDate(17).getMonth(), getRelativeDate(17).getDate(), 16, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(17).getFullYear(), getRelativeDate(17).getMonth(), getRelativeDate(17).getDate(), 18, 0, 0, 0)),
      duration: 120,
      branchId: mainBranch.branchId,
      notes: "高3数学 大学受験対策 微分積分",
    },
  });

  const classSession4 = await prisma.classSession.create({
    data: {
      teacherId: teacher4.teacherId,
      studentId: student3.studentId,
      subjectId: scienceSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: eastBoothA.boothId,
      date: getRelativeDateUTC(18),
      startTime: new Date(Date.UTC(getRelativeDate(18).getFullYear(), getRelativeDate(18).getMonth(), getRelativeDate(18).getDate(), 10, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(18).getFullYear(), getRelativeDate(18).getMonth(), getRelativeDate(18).getDate(), 12, 0, 0, 0)),
      duration: 120,
      branchId: eastBranch.branchId,
      notes: "高3化学 大学受験対策 有機化学",
    },
  });

  const classSession5 = await prisma.classSession.create({
    data: {
      teacherId: teacher5.teacherId,
      studentId: student5.studentId,
      subjectId: programmingSubject.subjectId,
      classTypeId: specialClassType.classTypeId,
      boothId: westBoothA.boothId,
      date: getRelativeDateUTC(19),
      startTime: new Date(Date.UTC(getRelativeDate(19).getFullYear(), getRelativeDate(19).getMonth(), getRelativeDate(19).getDate(), 19, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(19).getFullYear(), getRelativeDate(19).getMonth(), getRelativeDate(19).getDate(), 21, 0, 0, 0)),
      duration: 120,
      branchId: westBranch.branchId,
      notes: "JavaScript基礎 社会人向け",
    },
  });

  const classSession6 = await prisma.classSession.create({
    data: {
      teacherId: teacher2.teacherId,
      studentId: student6.studentId,
      subjectId: japaneseSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: boothA.boothId,
      date: getRelativeDateUTC(20),
      startTime: new Date(Date.UTC(getRelativeDate(20).getFullYear(), getRelativeDate(20).getMonth(), getRelativeDate(20).getDate(), 11, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(20).getFullYear(), getRelativeDate(20).getMonth(), getRelativeDate(20).getDate(), 12, 0, 0, 0)),
      duration: 60,
      branchId: mainBranch.branchId,
      notes: "小3国語 音読練習",
    },
  });

  const classSession7 = await prisma.classSession.create({
    data: {
      teacherId: teacher4.teacherId,
      studentId: student7.studentId,
      subjectId: scienceSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: eastBoothB.boothId,
      date: getRelativeDateUTC(21),
      startTime: new Date(Date.UTC(getRelativeDate(21).getFullYear(), getRelativeDate(21).getMonth(), getRelativeDate(21).getDate(), 15, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(21).getFullYear(), getRelativeDate(21).getMonth(), getRelativeDate(21).getDate(), 16, 30, 0, 0)),
      duration: 90,
      branchId: eastBranch.branchId,
      notes: "高1物理 力学の基礎",
    },
  });

  const classSession8 = await prisma.classSession.create({
    data: {
      teacherId: teacher1.teacherId,
      studentId: student8.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: testPrepClassType.classTypeId,
      boothId: boothB.boothId,
      date: getRelativeDateUTC(22),
      startTime: new Date(Date.UTC(getRelativeDate(22).getFullYear(), getRelativeDate(22).getMonth(), getRelativeDate(22).getDate(), 9, 0, 0, 0)),
      endTime: new Date(Date.UTC(getRelativeDate(22).getFullYear(), getRelativeDate(22).getMonth(), getRelativeDate(22).getDate(), 12, 0, 0, 0)),
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

  // Vacations and Holidays
  const vacations = [
    {
      name: "夏期休暇",
      startDate: getRelativeDateUTC(60),
      endDate: getRelativeDateUTC(70),
      isRecurring: false,
      branchId: mainBranch.branchId,
      notes: "全校舎夏期休暇",
      order: 1,
    },
    {
      name: "お盆休み",
      startDate: getRelativeDateUTC(63),
      endDate: getRelativeDateUTC(66),
      isRecurring: true,
      notes: "毎年恒例のお盆休み",
      order: 2,
    },
    {
      name: "年末年始休暇",
      startDate: getRelativeDateUTC(180),
      endDate: getRelativeDateUTC(185),
      isRecurring: true,
      notes: "年末年始休暇",
      order: 3,
    },
    {
      name: "東校メンテナンス日",
      startDate: getRelativeDateUTC(45),
      endDate: getRelativeDateUTC(45),
      isRecurring: false,
      branchId: eastBranch.branchId,
      notes: "設備メンテナンスのため東校のみ休校",
      order: 4,
    },
    {
      name: "ゴールデンウィーク",
      startDate: getRelativeDateUTC(100),
      endDate: getRelativeDateUTC(106),
      isRecurring: true,
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
  console.log(`   • Booths: 6`);
  console.log(`   • Student Types: 6`);
  console.log(`   • Class Types: 4`);
  console.log(`   • Subject Types: 3`);
  console.log(`   • Subjects: 7`);
  console.log(`   • Users: 13`);
  console.log(`   • Teachers: 5`);
  console.log(`   • Students: 8`);
  console.log(`   • Class Sessions: 8`);
  console.log(`   • User Availabilities: ${teacherAvailabilities.length + 2}`);
  console.log(`   • Vacations: 5`);
}

main()
  .catch((e) => {
    console.error("❌  シード失敗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
