import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withFullAdminRole } from "@/lib/auth";
import { adminUserUpdateSchema } from "@/schemas/adminUser.schema";
import { Session } from "next-auth";
import { Prisma } from "@prisma/client";

// GET - Get single admin user (Full Admin only)
export const GET = withFullAdminRole(
  async (request: NextRequest) => {
    const id = request.url.split("/").pop();

    const adminUser = await prisma.user.findUnique({
      where: {
        id,
        role: "ADMIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        order: true,
        isRestrictedAdmin: true,
        createdAt: true,
        updatedAt: true,
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
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "管理者ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // Transform the response
    const transformedUser = {
      ...adminUser,
      branches: adminUser.branches.map((ub) => ub.branch),
    };

    return NextResponse.json({ data: transformedUser });
  }
);

// PATCH - Update admin user (Full Admin only)
export const PATCH = withFullAdminRole(
  async (request: NextRequest, session: Session) => {
    try {
      const id = request.url.split("/").pop()!;
      const body = await request.json();

      // Validate request body
      const result = adminUserUpdateSchema.safeParse({ ...body, id });
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { name, email, username, password, branchIds, isRestrictedAdmin } = result.data;
      const currentUserId = session.user?.id;

      // Check if admin user exists and get current user's order
      const [existingUser, currentUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id, role: "ADMIN" },
          select: { id: true, order: true },
        }),
        prisma.user.findUnique({
          where: { id: currentUserId, role: "ADMIN" },
          select: { order: true },
        }),
      ]);

      if (!existingUser) {
        return NextResponse.json(
          { error: "管理者ユーザーが見つかりません" },
          { status: 404 }
        );
      }

      if (!currentUser) {
        return NextResponse.json(
          { error: "現在のユーザーが見つかりません" },
          { status: 404 }
        );
      }

      // Check rank-based permissions
      const targetUserOrder = existingUser.order ?? Number.MAX_SAFE_INTEGER;
      const currentUserOrder = currentUser.order ?? Number.MAX_SAFE_INTEGER;

      if (targetUserOrder <= currentUserOrder) {
        return NextResponse.json(
          { error: "同じまたは上位の権限を持つ管理者を編集することはできません" },
          { status: 403 }
        );
      }

      // Check for username/email conflicts with other users
      if (username || email) {
        const conflictingUser = await prisma.user.findFirst({
          where: {
            id: { not: id },
            OR: [
              username ? { username } : {},
              email ? { email } : {},
            ].filter(obj => Object.keys(obj).length > 0),
          },
        });

        if (conflictingUser) {
          if (username && conflictingUser.username === username) {
            return NextResponse.json(
              { error: "このユーザー名は既に使用されています" },
              { status: 409 }
            );
          }
          if (email && conflictingUser.email === email) {
            return NextResponse.json(
              { error: "このメールアドレスは既に使用されています" },
              { status: 409 }
            );
          }
        }
      }

      // Build update data
      const updateData: Prisma.UserUpdateInput = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (username !== undefined) updateData.username = username;
      if (isRestrictedAdmin !== undefined) updateData.isRestrictedAdmin = isRestrictedAdmin;
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      // Update branch associations if provided
      if (branchIds !== undefined) {
        // Delete existing associations and create new ones
        await prisma.userBranch.deleteMany({
          where: { userId: id },
        });
        updateData.branches = {
          create: branchIds.map((branchId) => ({
            branchId,
          })),
        };
      }

      // Update the admin user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          order: true,
          isRestrictedAdmin: true,
          createdAt: true,
          updatedAt: true,
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
      });

      // Transform the response
      const transformedUser = {
        ...updatedUser,
        branches: updatedUser.branches.map((ub) => ub.branch),
      };

      return NextResponse.json({
        data: transformedUser,
        message: "管理者ユーザーが正常に更新されました",
      });
    } catch (error) {
      console.error("Error updating admin user:", error);
      return NextResponse.json(
        { error: "管理者ユーザーの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete admin user (Full Admin only)
export const DELETE = withFullAdminRole(
  async (request: NextRequest, session: Session) => {
    try {
      const id = request.url.split("/").pop()!;

      const currentUserId = session.user?.id;

      // Prevent self-deletion
      if (currentUserId === id) {
        return NextResponse.json(
          { error: "自分自身を削除することはできません" },
          { status: 400 }
        );
      }

      // Check if admin user exists and get current user's order
      const [existingUser, currentUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id, role: "ADMIN" },
          select: { id: true, order: true },
        }),
        prisma.user.findUnique({
          where: { id: currentUserId, role: "ADMIN" },
          select: { order: true },
        }),
      ]);

      if (!existingUser) {
        return NextResponse.json(
          { error: "管理者ユーザーが見つかりません" },
          { status: 404 }
        );
      }

      if (!currentUser) {
        return NextResponse.json(
          { error: "現在のユーザーが見つかりません" },
          { status: 404 }
        );
      }

      // Check rank-based permissions
      const targetUserOrder = existingUser.order ?? Number.MAX_SAFE_INTEGER;
      const currentUserOrder = currentUser.order ?? Number.MAX_SAFE_INTEGER;

      if (targetUserOrder <= currentUserOrder) {
        return NextResponse.json(
          { error: "同じまたは上位の権限を持つ管理者を削除することはできません" },
          { status: 403 }
        );
      }

      // Check if this is the last admin
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "最後の管理者ユーザーは削除できません" },
          { status: 400 }
        );
      }

      // Check for branch assignments
      const branchAssignments = await prisma.userBranch.count({
        where: { userId: id }
      });

      if (branchAssignments > 0) {
        return NextResponse.json(
          { 
            error: `この管理者は${branchAssignments}つの校舎に割り当てられているため削除できません。`,
            details: {
              branchAssignments
            }
          },
          { status: 400 }
        );
      }

      // Delete the admin user
      await prisma.user.delete({
        where: { id },
      });

      return NextResponse.json({
        message: "管理者ユーザーが正常に削除されました",
      });
    } catch (error) {
      console.error("Error deleting admin user:", error);
      return NextResponse.json(
        { error: "管理者ユーザーの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
