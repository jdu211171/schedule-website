import { NextRequest, NextResponse } from "next/server";
import { withFullAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminUserOrderUpdateSchema } from "@/schemas/adminUser.schema";
import { Session } from "next-auth";

// PATCH - Update admin user order (Full Admin only)
export const PATCH = withFullAdminRole(
  async (request: NextRequest, session: Session) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = adminUserOrderUpdateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "無効な順序データです" },
          { status: 400 }
        );
      }

      const { userIds } = result.data;
      const currentUserId = session.user?.id;

      if (!currentUserId) {
        return NextResponse.json({ error: "認証エラー" }, { status: 401 });
      }

      // Get current user's order
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId, role: "ADMIN" },
        select: { order: true },
      });

      if (!currentUser) {
        return NextResponse.json(
          { error: "現在のユーザーが見つかりません" },
          { status: 404 }
        );
      }

      // Verify all user IDs exist and are admins
      const existingAdmins = await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
          role: "ADMIN",
        },
        select: {
          id: true,
          order: true,
        },
      });

      if (existingAdmins.length !== userIds.length) {
        return NextResponse.json(
          { error: "一部のユーザーIDが存在しないか、管理者ではありません" },
          { status: 400 }
        );
      }

      // Check permissions: admin can only change order of admins below them
      const currentUserOrder = currentUser.order || Number.MAX_SAFE_INTEGER;

      // Check if current user can modify all the admins in the list
      for (const admin of existingAdmins) {
        const adminOrder = admin.order || Number.MAX_SAFE_INTEGER;

        // Skip self - admin can include themselves in the reorder
        if (admin.id === currentUserId) continue;

        // Check if trying to reorder an admin with higher or equal rank (lower order number)
        if (adminOrder <= currentUserOrder) {
          return NextResponse.json(
            {
              error:
                "同じまたは上位の権限を持つ管理者の順序を変更することはできません",
            },
            { status: 403 }
          );
        }
      }

      // Additional validation: ensure the current user maintains their position relative to higher-ranked admins
      const currentUserNewPosition = userIds.indexOf(currentUserId);
      if (currentUserNewPosition !== -1) {
        // Get all higher-ranked admins (those with lower order numbers than current user)
        const higherRankedAdmins = await prisma.user.findMany({
          where: {
            role: "ADMIN",
            order: {
              lt: currentUserOrder,
            },
          },
          select: { id: true, order: true },
          orderBy: { order: "asc" },
        });

        // Count how many higher-ranked admins should be before current user
        const higherRankedCount = higherRankedAdmins.length;

        // Current user cannot be positioned before any higher-ranked admin
        if (currentUserNewPosition < higherRankedCount) {
          return NextResponse.json(
            { error: "上位の管理者より前に自分を配置することはできません" },
            { status: 403 }
          );
        }
      }

      // Update admin orders in a transaction
      // Only update the orders of the admins that the current user can modify
      await prisma.$transaction(async (tx) => {
        // Get all admins ordered by current order to maintain consistency
        const allAdmins = await tx.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true, order: true },
          orderBy: [
            { order: { sort: "asc", nulls: "last" } },
            { createdAt: "asc" }, // fallback for null orders
          ],
        });

        // Separate higher-ranked admins (those the current user cannot modify)
        const higherRankedAdmins = allAdmins.filter((admin) => {
          const adminOrder = admin.order || Number.MAX_SAFE_INTEGER;
          return adminOrder < currentUserOrder && admin.id !== currentUserId;
        });

        // Calculate new orders
        const updatePromises: Promise<{ id: string; order: number | null }>[] =
          [];

        // First, preserve the order of higher-ranked admins
        higherRankedAdmins.forEach((admin, index) => {
          updatePromises.push(
            tx.user.update({
              where: { id: admin.id },
              data: { order: index + 1 },
            })
          );
        });

        // Then, set the order for the reordered admins (starting after higher-ranked ones)
        const startOrder = higherRankedAdmins.length + 1;
        userIds.forEach((userId, index) => {
          updatePromises.push(
            tx.user.update({
              where: { id: userId },
              data: { order: startOrder + index },
            })
          );
        });

        await Promise.all(updatePromises);
      });

      return NextResponse.json({
        message: "管理者の順序を更新しました",
      });
    } catch (error) {
      console.error("Error updating admin user order:", error);
      return NextResponse.json(
        { error: "管理者の順序更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
