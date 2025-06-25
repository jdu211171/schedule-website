import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const GET = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const branchId = req.headers.get("X-Selected-Branch");

    // Build where conditions dynamically
    const buildStudentWhere = (additional?: Prisma.StudentWhereInput): Prisma.StudentWhereInput => {
      const where: Prisma.StudentWhereInput = { ...additional };
      
      if (branchId) {
        where.user = {
          branches: {
            some: { branchId }
          }
        };
      }
      
      return where;
    };

    const buildTeacherWhere = (additional?: Prisma.TeacherWhereInput): Prisma.TeacherWhereInput => {
      const where: Prisma.TeacherWhereInput = { ...additional };
      
      if (branchId) {
        where.user = {
          branches: {
            some: { branchId }
          }
        };
      }
      
      return where;
    };

    // Get student statistics
    const [totalStudents, linkedStudents, notificationsEnabledStudents] = await Promise.all([
      prisma.student.count({ where: buildStudentWhere() }),
      prisma.student.count({
        where: buildStudentWhere({ lineId: { not: null } })
      }),
      prisma.student.count({
        where: buildStudentWhere({ 
          lineId: { not: null },
          lineNotificationsEnabled: true 
        })
      })
    ]);

    // Get teacher statistics
    const [totalTeachers, linkedTeachers, notificationsEnabledTeachers] = await Promise.all([
      prisma.teacher.count({ where: buildTeacherWhere() }),
      prisma.teacher.count({
        where: buildTeacherWhere({ lineId: { not: null } })
      }),
      prisma.teacher.count({
        where: buildTeacherWhere({ 
          lineId: { not: null },
          lineNotificationsEnabled: true 
        })
      })
    ]);

    return NextResponse.json({
      data: {
        totalStudents,
        linkedStudents,
        notificationsEnabledStudents,
        totalTeachers,
        linkedTeachers,
        notificationsEnabledTeachers,
      }
    });
  } catch (error) {
    console.error("Error fetching LINE statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch LINE statistics" },
      { status: 500 }
    );
  }
});