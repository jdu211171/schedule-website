import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for creating/updating line links
const lineLinksSchema = z.object({
  channelId: z.string(),
  lineUserId: z.string(),
  enabled: z.boolean().optional().default(true),
});

// GET /api/teachers/[teacherId]/line-links
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const urlParts = req.url.split("/");
    const teacherId = urlParts[urlParts.length - 2]; // Get teacherId from URL
    const userBranches = session.user?.branches || [];

    // Verify teacher exists and user has access
    const teacher = await prisma.teacher.findFirst({
      where: {
        teacherId,
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

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get all LINE links for this teacher
    const lineLinks = await prisma.teacherLineLink.findMany({
      where: { teacherId },
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
      orderBy: { createdAt: "desc" },
    });

    // Transform to hide sensitive data
    const transformedLinks = lineLinks.map((link) => ({
      id: link.id,
      channelId: link.channelId,
      channelName: link.channel.name,
      channelDescription: link.channel.description,
      channelActive: link.channel.isActive,
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

// POST /api/teachers/[teacherId]/line-links
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const urlParts = req.url.split("/");
    const teacherId = urlParts[urlParts.length - 2]; // Get teacherId from URL
    const userBranches = session.user?.branches || [];

    // Verify teacher exists and user has access
    const teacher = await prisma.teacher.findFirst({
      where: {
        teacherId,
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

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
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

    const { channelId, lineUserId, enabled } = validation.data;

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
    const existingLink = await prisma.teacherLineLink.findFirst({
      where: {
        channelId,
        lineUserId,
        NOT: { teacherId },
      },
    });

    const existingStudentLink = await prisma.studentLineLink.findFirst({
      where: {
        channelId,
        lineUserId,
      },
    });

    if (existingLink || existingStudentLink) {
      return NextResponse.json(
        {
          error:
            "This LINE ID is already linked to another account on this channel",
        },
        { status: 409 }
      );
    }

    // Create or update the link
    const link = await prisma.teacherLineLink.upsert({
      where: {
        channelId_teacherId: {
          channelId,
          teacherId,
        },
      },
      update: {
        lineUserId,
        enabled,
        updatedAt: new Date(),
      },
      create: {
        channelId,
        teacherId,
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
      lineUserId: link.lineUserId,
      enabled: link.enabled,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    });
  }
);

// DELETE /api/teachers/[teacherId]/line-links
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session, branchId) => {
    const urlParts = req.url.split("/");
    const teacherId = urlParts[urlParts.length - 2]; // Get teacherId from URL
    const userBranches = session.user?.branches || [];
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    const channelId = searchParams.get("channelId");

    // Verify teacher exists and user has access
    const teacher = await prisma.teacher.findFirst({
      where: {
        teacherId,
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

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    try {
      if (linkId) {
        // Delete by link ID
        await prisma.teacherLineLink.delete({
          where: {
            id: linkId,
            teacherId, // Ensure the link belongs to this teacher
          },
        });
      } else if (channelId) {
        // Delete by composite key
        await prisma.teacherLineLink.delete({
          where: {
            channelId_teacherId: {
              channelId,
              teacherId,
            },
          },
        });
      } else {
        return NextResponse.json(
          { error: "Either linkId or channelId must be provided" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting teacher LINE link:", error);
      return NextResponse.json(
        { error: "Failed to delete LINE link" },
        { status: 500 }
      );
    }
  }
);
