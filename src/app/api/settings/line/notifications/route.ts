import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateNotificationSchema = z.object({
  userType: z.enum(["students", "teachers", "all"]),
  enabled: z.boolean(),
});

export const PUT = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { userType, enabled } = updateNotificationSchema.parse(body);
    const branchId = req.headers.get("X-Selected-Branch");

    // Build where conditions for updates
    const buildStudentWhere = (): Prisma.StudentWhereInput => {
      const where: Prisma.StudentWhereInput = {
        lineId: { not: null },
      };

      if (branchId) {
        where.user = {
          branches: {
            some: { branchId },
          },
        };
      }

      return where;
    };

    const buildTeacherWhere = (): Prisma.TeacherWhereInput => {
      const where: Prisma.TeacherWhereInput = {
        lineId: { not: null },
      };

      if (branchId) {
        where.user = {
          branches: {
            some: { branchId },
          },
        };
      }

      return where;
    };

    let updatedCount = 0;

    // Update based on user type
    if (userType === "students" || userType === "all") {
      const result = await prisma.student.updateMany({
        where: buildStudentWhere(),
        data: {
          lineNotificationsEnabled: enabled,
          updatedAt: new Date(),
        },
      });
      updatedCount += result.count;
    }

    if (userType === "teachers" || userType === "all") {
      const result = await prisma.teacher.updateMany({
        where: buildTeacherWhere(),
        data: {
          lineNotificationsEnabled: enabled,
          updatedAt: new Date(),
        },
      });
      updatedCount += result.count;
    }

    return NextResponse.json({
      data: {
        updated: updatedCount,
        userType,
        enabled,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
});
