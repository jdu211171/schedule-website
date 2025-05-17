import { PrismaClient, UserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  シード処理開始");

  /* ------------------------------------------------------------------
   * 1. 基本マスター
   * ----------------------------------------------------------------*/
  // 1‑a. Branch
  const mainBranch = await prisma.branch.create({
    data: {
      name: "Main Branch",
      notes: "デフォルト拠点",
    },
  });

  // 1‑b. StudentType
  const generalStudentType = await prisma.studentType.create({
    data: {
      name: "一般",
      maxYears: 12,
      description: "特定の区分に属さない学生",
    },
  });

  // 1‑c. ClassType
  const regularClassType = await prisma.classType.create({
    data: {
      name: "通常授業",
      notes: "週次の通常授業枠",
    },
  });

  // 1‑d. Subject
  const mathSubject = await prisma.subject.create({
    data: {
      name: "数学",
      notes: "算数・数学全般",
    },
  });

  // 1‑e. Booth (紐付けるため Branch 先に作成済)
  const boothA = await prisma.booth.create({
    data: {
      name: "Booth‑A",
      branchId: mainBranch.branchId,
      notes: "1F 奥側",
    },
  });

  /* ------------------------------------------------------------------
   * 2. ユーザ & 権限
   * ----------------------------------------------------------------*/
  // Create admin user separately
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "管理者",
      email: "admin@example.com",
      username: "ADMIN01",
      passwordHash: "admin123",
      role: UserRole.ADMIN,
    },
  });

  // Create teacher and student users that will be referenced later
  const [teacherUser, studentUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: "teacher@example.com" },
      update: {},
      create: {
        name: "山田 太郎",
        email: "teacher@example.com",
        username: "TEACHER01",
        passwordHash: "teacher123",
        role: UserRole.TEACHER,
      },
    }),
    prisma.user.upsert({
      where: { email: "student@example.com" },
      update: {},
      create: {
        name: "佐藤 花子",
        email: "student@example.com",
        username: "STUDENT01",
        passwordHash: "student123",
        role: UserRole.STUDENT,
      },
    }),
  ]);

  // 2‑b. UserBranch (teacher & student を Main Branch に紐付け)
  await prisma.userBranch.createMany({
    data: [
      { userId: teacherUser.id, branchId: mainBranch.branchId },
      { userId: studentUser.id, branchId: mainBranch.branchId },
    ],
    skipDuplicates: true,
  });

  /* ------------------------------------------------------------------
   * 3. Teacher / Student エンティティ
   * ----------------------------------------------------------------*/
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      name: teacherUser.name!,
      email: teacherUser.email!,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      name: studentUser.name!,
      studentTypeId: generalStudentType.studentTypeId,
      gradeYear: 1,
    },
  });

  /* ------------------------------------------------------------------
   * 4. 授業 (ClassSession) と関連テーブル
   * ----------------------------------------------------------------*/
  // 4‑a. ClassSession
  const classSession = await prisma.classSession.create({
    data: {
      teacherId: teacher.teacherId,
      studentId: student.studentId,
      subjectId: mathSubject.subjectId,
      classTypeId: regularClassType.classTypeId,
      boothId: boothA.boothId,
      date: new Date("2025-06-15"),
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T10:30:00Z"),
      duration: 90, // 分
      notes: "数学定期テスト対策",
    },
  });

  // 4‑b. StudentClassEnrollment (junction)
  await prisma.studentClassEnrollment.create({
    data: {
      classId: classSession.classId,
      studentId: student.studentId,
      status: "Confirmed",
    },
  });

  /* ------------------------------------------------------------------
   * 5. 付随テーブル (Notification / Event)
   * ----------------------------------------------------------------*/
  await prisma.notification.create({
    data: {
      recipientType: "STUDENT",
      recipientId: student.studentId,
      notificationType: "CLASS_REMINDER",
      message: "明日の数学の授業に遅れないようにしましょう！",
      relatedClassId: classSession.classId,
      sentVia: "EMAIL",
      sentAt: new Date(),
      status: "SENT",
    },
  });

  await prisma.event.create({
    data: {
      name: "夏期休暇",
      startDate: new Date("2025-08-10"),
      endDate: new Date("2025-08-20"),
      isRecurring: false,
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
