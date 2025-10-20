import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for creating/updating line links
const lineLinksSchema = z.object({
  channelId: z.string(),
  accountSlot: z.enum(["student", "parent"]),
  lineUserId: z.string(),
  enabled: z.boolean().optional().default(true),
});

// GET /api/students/[studentId]/line-links
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const urlParts = req.url.split("/");
    const studentId = urlParts[urlParts.length - 2]; // Get studentId from URL
    const userBranches = session.user?.branches || [];

    // Verify student exists and user has access
    const student = await prisma.student.findFirst({
      where: {
        studentId,
        user: {
          branches: {
            some: {
              branchId: {
                in: userBranches.map((ub: any) => ub.branchId),
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all LINE links for this student
    const lineLinks = await prisma.studentLineLink.findMany({
      where: { studentId },
      include: {
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

    // Transform to hide sensitive data
    const transformedLinks = lineLinks.map((link) => ({
      id: link.id,
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

    return NextResponse.json({
      data: transformedLinks,
      total: transformedLinks.length,
    });
  }
);

// POST /api/students/[studentId]/line-links
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const urlParts = req.url.split("/");
    const studentId = urlParts[urlParts.length - 2]; // Get studentId from URL
    const userBranches = session.user?.branches || [];

    // Verify student exists and user has access
    const student = await prisma.student.findFirst({
      where: {
        studentId,
        user: {
          branches: {
            some: {
              branchId: {
                in: userBranches.map((ub: any) => ub.branchId),
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = lineLinksSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { channelId, accountSlot, lineUserId, enabled } = validation.data;

    // Verify channel exists
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId },
    });

    if (!channel || !channel.isActive) {
      return NextResponse.json(
        { error: "Channel not found or inactive" },
        { status: 404 }
      );
    }

    // Check if LINE ID is already linked to another account on this channel
    const existingLink = await prisma.studentLineLink.findFirst({
      where: {
        channelId,
        lineUserId,
        NOT: { studentId },
      },
    });

    const existingTeacherLink = await prisma.teacherLineLink.findFirst({
      where: {
        channelId,
        lineUserId,
      },
    });

    if (existingLink || existingTeacherLink) {
      return NextResponse.json(
        {
          error:
            "This LINE ID is already linked to another account on this channel",
        },
        { status: 409 }
      );
    }

    // Enforce global uniqueness for parent slot per student across channels
    if (accountSlot === "parent") {
      const existingParent = await prisma.studentLineLink.findFirst({
        where: {
          studentId,
          accountSlot: "parent",
        },
      });
      if (existingParent && existingParent.lineUserId !== lineUserId) {
        return NextResponse.json(
          {
            error:
              "A different parent LINE account is already linked for this student. Please unlink it first.",
          },
          { status: 409 }
        );
      }
    }

    // Create or update the link
    const link = await prisma.studentLineLink.upsert({
      where: {
        channelId_studentId_accountSlot: {
          channelId,
          studentId,
          accountSlot,
        },
      },
      update: {
        lineUserId,
        enabled,
        updatedAt: new Date(),
      },
      create: {
        channelId,
        studentId,
        accountSlot,
        lineUserId,
        enabled,
      },
      include: {
        channel: {
          select: {
            channelId: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: link.id,
      channelId: link.channelId,
      channelName: link.channel.name,
      channelDescription: link.channel.description,
      channelActive: link.channel.isActive,
      accountSlot: link.accountSlot,
      lineUserId: link.lineUserId,
      enabled: link.enabled,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    });
  }
);

// DELETE /api/students/[studentId]/line-links
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const urlParts = req.url.split("/");
    const studentId = urlParts[urlParts.length - 2]; // Get studentId from URL
    const userBranches = session.user?.branches || [];
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    const channelId = searchParams.get("channelId");
    const accountSlot = searchParams.get("accountSlot");

    // Verify student exists and user has access
    const student = await prisma.student.findFirst({
      where: {
        studentId,
        user: {
          branches: {
            some: {
              branchId: {
                in: userBranches.map((ub: any) => ub.branchId),
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    try {
      if (linkId) {
        // Delete by link ID
        await prisma.studentLineLink.delete({
          where: {
            id: linkId,
            studentId, // Ensure the link belongs to this student
          },
        });
      } else if (channelId && accountSlot) {
        // Delete by composite key
        await prisma.studentLineLink.delete({
          where: {
            channelId_studentId_accountSlot: {
              channelId,
              studentId,
              accountSlot: accountSlot as any,
            },
          },
        });
      } else {
        return NextResponse.json(
          {
            error:
              "Either linkId or both channelId and accountSlot must be provided",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting student LINE link:", error);
      return NextResponse.json(
        { error: "Failed to delete LINE link" },
        { status: 500 }
      );
    }
  }
);
