import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const lineUnbindSchema = z.object({
  confirm: z.boolean().refine(val => val === true, {
    message: "Confirmation required"
  })
});

// PATCH /api/teachers/[teacherId]/line-unbind - Unbind teacher's LINE account
export const PATCH = withBranchAccess(["ADMIN", "STAFF"], async (
  req: NextRequest,
  session,
  branchId
) => {
  // Extract teacherId from URL
  const urlParts = req.url.split("/");
  const lineUnbindIndex = urlParts.indexOf("line-unbind");
  const teacherId = urlParts[lineUnbindIndex - 1];

  try {
    // Validate request body
    const body = await req.json();
    lineUnbindSchema.parse(body);

    // Get current teacher data
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
      select: {
        teacherId: true,
        name: true,
        lineId: true,
        lineUserId: true,
        user: {
          select: {
            branches: {
              select: {
                branchId: true
              }
            }
          }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Branch ID is provided by withBranchAccess middleware

    // Check if teacher belongs to the branch
    const belongsToBranch = teacher.user.branches.some(b => b.branchId === branchId);
    if (!belongsToBranch) {
      return NextResponse.json(
        { error: "Teacher does not belong to this branch" },
        { status: 403 }
      );
    }

    // Check if LINE is already unbound
    if (!teacher.lineId && !teacher.lineUserId) {
      return NextResponse.json(
        { error: "Teacher is not connected to LINE" },
        { status: 400 }
      );
    }

    // Unbind LINE account
    const updatedTeacher = await prisma.teacher.update({
      where: { teacherId },
      data: {
        lineId: null,
        lineUserId: null,
        lineNotificationsEnabled: false
      },
      select: {
        teacherId: true,
        name: true,
        lineId: true,
        lineUserId: true,
        lineNotificationsEnabled: true
      }
    });

    // Also disable any per-channel links for this teacher
    await prisma.teacherLineLink.updateMany({
      where: { teacherId, enabled: true },
      data: { enabled: false }
    });

    return NextResponse.json({
      data: updatedTeacher,
      message: "LINE account unbound successfully"
    });
  } catch (error) {
    console.error("Error unbinding teacher LINE account:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to unbind LINE account" },
      { status: 500 }
    );
  }
});
