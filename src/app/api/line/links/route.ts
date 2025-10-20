import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/line/links
// Query parameters:
// - channelId: Filter by channel ID
// - userType: Filter by user type (TEACHER or STUDENT)
// - userId: Filter by teacher/student ID
// - lineUserId: Filter by LINE user ID
// - enabled: Filter by enabled status
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const userType = searchParams.get("userType");
    const userId = searchParams.get("userId");
    const lineUserId = searchParams.get("lineUserId");
    const enabled = searchParams.get("enabled");
    const userBranches = session.user?.branches || [];

    const results = {
      teacherLinks: [] as any[],
      studentLinks: [] as any[],
      total: 0,
    };

    // Build where clauses based on filters
    const teacherWhere: any = {};
    const studentWhere: any = {};

    if (channelId) {
      teacherWhere.channelId = channelId;
      studentWhere.channelId = channelId;
    }

    if (lineUserId) {
      teacherWhere.lineUserId = lineUserId;
      studentWhere.lineUserId = lineUserId;
    }

    if (enabled !== null && enabled !== undefined) {
      const enabledBool = enabled === "true";
      teacherWhere.enabled = enabledBool;
      studentWhere.enabled = enabledBool;
    }

    // Filter by specific user if provided
    if (userId && userType === "TEACHER") {
      teacherWhere.teacherId = userId;
    } else if (userId && userType === "STUDENT") {
      studentWhere.studentId = userId;
    }

    // Ensure user has access to the branches
    const branchFilter = {
      user: {
        branches: {
          some: {
            branchId: {
              in: userBranches.map((ub: any) => ub.branchId),
            },
          },
        },
      },
    };

    // Get teacher links if not filtered to students only
    if (!userType || userType === "TEACHER") {
      const teacherLinks = await prisma.teacherLineLink.findMany({
        where: {
          ...teacherWhere,
          teacher: branchFilter,
        },
        include: {
          teacher: {
            select: {
              teacherId: true,
              name: true,
              email: true,
              user: {
                select: {
                  username: true,
                  branches: {
                    select: {
                      branch: {
                        select: {
                          branchId: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          channel: {
            select: {
              channelId: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      results.teacherLinks = teacherLinks.map((link) => ({
        id: link.id,
        userType: "TEACHER",
        userId: link.teacherId,
        userName: link.teacher.name,
        userEmail: link.teacher.email,
        username: link.teacher.user.username,
        branches: link.teacher.user.branches.map((ub) => ({
          branchId: ub.branch.branchId,
          name: ub.branch.name,
        })),
        channelId: link.channelId,
        channelName: link.channel.name,
        channelDescription: link.channel.description,
        channelActive: link.channel.isActive,
        lineUserId: link.lineUserId,
        enabled: link.enabled,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      }));
    }

    // Get student links if not filtered to teachers only
    if (!userType || userType === "STUDENT") {
      const studentLinks = await prisma.studentLineLink.findMany({
        where: {
          ...studentWhere,
          student: branchFilter,
        },
        include: {
          student: {
            select: {
              studentId: true,
              name: true,
              user: {
                select: {
                  username: true,
                  email: true,
                  branches: {
                    select: {
                      branch: {
                        select: {
                          branchId: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          channel: {
            select: {
              channelId: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ accountSlot: "asc" }, { createdAt: "desc" }],
      });

      results.studentLinks = studentLinks.map((link) => ({
        id: link.id,
        userType: "STUDENT",
        userId: link.studentId,
        userName: link.student.name,
        userEmail: link.student.user.email,
        username: link.student.user.username,
        branches: link.student.user.branches.map((ub) => ({
          branchId: ub.branch.branchId,
          name: ub.branch.name,
        })),
        channelId: link.channelId,
        channelName: link.channel.name,
        channelDescription: link.channel.description,
        channelActive: link.channel.isActive,
        accountSlot: link.accountSlot,
        lineUserId: link.lineUserId,
        enabled: link.enabled,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      }));
    }

    results.total = results.teacherLinks.length + results.studentLinks.length;

    return NextResponse.json(results);
  }
);
