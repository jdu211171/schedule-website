// src/app/api/students/me/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { passwordUpdateSchema } from "@/schemas/password.schema";

export async function PATCH(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "認証が必要です" }, // "Authentication required"
        { status: 401 }
      );
    }

    // Ensure the user is a student
    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "学生のみがこの機能を使用できます" }, // "Only students can use this feature"
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const result = passwordUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Get the student's user record
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { student: true },
    });

    if (!user || !user.student) {
      return NextResponse.json(
        { error: "学生アカウントが見つかりません" }, // "Student account not found"
        { status: 404 }
      );
    }

    // Verify current password (students use plain text passwords)
    if (user.passwordHash !== currentPassword) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません" }, // "Current password is incorrect"
        { status: 400 }
      );
    }

    // Update password (students use plain text)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPassword },
    });

    return NextResponse.json({
      message: "パスワードが正常に更新されました" // "Password updated successfully"
    });

  } catch (error) {
    console.error("Error updating student password:", error);
    return NextResponse.json(
      { error: "パスワードの更新に失敗しました" }, // "Failed to update password"
      { status: 500 }
    );
  }
}
