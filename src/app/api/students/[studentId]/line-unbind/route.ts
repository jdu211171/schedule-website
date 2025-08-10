import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const lineUnbindSchema = z.object({
  accountType: z.enum(["student", "parent"]),
  confirm: z.boolean().refine(val => val === true, {
    message: "Confirmation required"
  })
});

// PATCH /api/students/[studentId]/line-unbind - Unbind student's LINE account(s)
export const PATCH = withBranchAccess(["ADMIN", "STAFF"], async (
  req: NextRequest,
  session,
  branchId
) => {
  // Extract studentId from URL
  const urlParts = req.url.split("/");
  const lineUnbindIndex = urlParts.indexOf("line-unbind");
  const studentId = urlParts[lineUnbindIndex - 1];

  try {
    // Validate request body
    const body = await req.json();
    const { accountType } = lineUnbindSchema.parse(body);

    // Get current student data
    const student = await prisma.student.findUnique({
      where: { studentId },
      select: {
        studentId: true,
        name: true,
        lineId: true,
        lineUserId: true,
        parentLineId1: true,
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

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Branch ID is provided by withBranchAccess middleware

    // Check if student belongs to the branch
    const belongsToBranch = student.user.branches.some(b => b.branchId === branchId);
    if (!belongsToBranch) {
      return NextResponse.json(
        { error: "Student does not belong to this branch" },
        { status: 403 }
      );
    }

    // Prepare update data based on account type
    let updateData: any = {};
    let wasConnected = false;

    switch (accountType) {
      case "student":
        if (!student.lineId && !student.lineUserId) {
          return NextResponse.json(
            { error: "Student LINE account is not connected" },
            { status: 400 }
          );
        }
        wasConnected = true;
        updateData = {
          lineId: null,
          lineUserId: null,
          lineNotificationsEnabled: false
        };
        break;

      case "parent":
        if (!student.parentLineId1) {
          return NextResponse.json(
            { error: "Parent LINE account is not connected" },
            { status: 400 }
          );
        }
        wasConnected = true;
        updateData = {
          parentLineId1: null
        };
        break;
    }

    // Unbind LINE account
    const updatedStudent = await prisma.student.update({
      where: { studentId },
      data: updateData,
      select: {
        studentId: true,
        name: true,
        lineId: true,
        lineUserId: true,
        lineNotificationsEnabled: true,
        parentLineId1: true
      }
    });

    // Also disable any per-channel links for this student and slot
    await prisma.studentLineLink.updateMany({
      where: { studentId, accountSlot: accountType as any, enabled: true },
      data: { enabled: false }
    });

    const accountLabel = accountType === "student" ? "生徒" : "保護者";

    return NextResponse.json({
      data: updatedStudent,
      message: `${accountLabel}のLINEアカウントを解除しました`
    });
  } catch (error) {
    console.error("Error unbinding student LINE account:", error);

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
