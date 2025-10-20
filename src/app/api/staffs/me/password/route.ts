// src/app/api/staffs/me/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { passwordUpdateSchema } from "@/schemas/password.schema";
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "スタッフのみがこの機能を使用できます" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = passwordUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // Staff uses hashed passwords
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "現在のパスワードが設定されていません" },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashed },
    });

    return NextResponse.json({ message: "パスワードが正常に更新されました" });
  } catch (error) {
    console.error("Error updating staff password:", error);
    return NextResponse.json(
      { error: "パスワードの更新に失敗しました" },
      { status: 500 }
    );
  }
}
