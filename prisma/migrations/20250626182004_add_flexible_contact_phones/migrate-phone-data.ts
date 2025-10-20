import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migratePhoneData() {
  console.log("Starting phone data migration...");

  const students = await prisma.student.findMany({
    select: {
      studentId: true,
      homePhone: true,
      parentPhone: true,
      studentPhone: true,
    },
  });

  let migrated = 0;

  for (const student of students) {
    const phonesToCreate = [];
    let order = 0;

    // Migrate home phone
    if (student.homePhone) {
      phonesToCreate.push({
        studentId: student.studentId,
        phoneType: "HOME" as const,
        phoneNumber: student.homePhone,
        order: order++,
        notes: null,
      });
    }

    // Migrate parent phone
    if (student.parentPhone) {
      phonesToCreate.push({
        studentId: student.studentId,
        phoneType: "OTHER" as const,
        phoneNumber: student.parentPhone,
        order: order++,
        notes: "保護者",
      });
    }

    // Migrate student phone
    if (student.studentPhone) {
      phonesToCreate.push({
        studentId: student.studentId,
        phoneType: "OTHER" as const,
        phoneNumber: student.studentPhone,
        order: order++,
        notes: "生徒",
      });
    }

    if (phonesToCreate.length > 0) {
      await prisma.contactPhone.createMany({
        data: phonesToCreate,
      });
      migrated++;
    }
  }

  console.log(
    `Migration complete. Migrated phone data for ${migrated} students.`
  );
}

migratePhoneData()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
