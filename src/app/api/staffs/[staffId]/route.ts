// src/app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffUpdateSchema } from "@/schemas/staff.schema";
import { User } from "@prisma/client";
import bcrypt from "bcryptjs";

type FormattedStaff = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
  branches: {
    branchId: string;
    name: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format staff response with proper typing
const formatStaff = (
  staff: User & { branches?: { branch: { branchId: string; name: string } }[] }
): FormattedStaff => ({
  id: staff.id,
  name: staff.name,
  username: staff.username,
  email: staff.email,
  role: staff.role,
  branches:
    staff.branches?.map((ub) => ({
      branchId: ub.branch.branchId,
      name: ub.branch.name,
    })) || [],
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

// GET a specific staff by ID
export const GET = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    const id = request.url.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    const staff = await prisma.user.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
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

    if (!staff || staff.role !== "STAFF") {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Format response using the helper function
    const formattedStaff = formatStaff(staff);

    return NextResponse.json({
      data: [formattedStaff],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a staff
export const PATCH = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    try {
      const id = request.url.split("/").pop();
      if (!id) {
        return NextResponse.json(
          { error: "Staff ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = staffUpdateSchema.safeParse({ ...body, id });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if staff exists
      const existingStaff = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingStaff || existingStaff.role !== "STAFF") {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }

      const { username, password, email, name, branchIds } = result.data;

      // Check username uniqueness if being updated
      if (username && username !== existingStaff.username) {
        const userExists = await prisma.user.findFirst({
          where: { username, id: { not: id } },
        });

        if (userExists) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
      }

      // Check email uniqueness if being updated
      if (email && email !== existingStaff.email) {
        const emailExists = await prisma.user.findFirst({
          where: { email, id: { not: id } },
        });

        if (emailExists) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
      }

      // Verify that all branchIds exist if provided
      if (branchIds && branchIds.length > 0) {
        const branchCount = await prisma.branch.count({
          where: { branchId: { in: branchIds } },
        });

        if (branchCount !== branchIds.length) {
          return NextResponse.json(
            { error: "一部の校舎IDが存在しません" }, // "Some branch IDs do not exist"
            { status: 400 }
          );
        }
      }

      // Update staff user with branch associations in a transaction
      const updatedStaff = await prisma.$transaction(async (tx) => {
        // Create update data object
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (username !== undefined) updateData.username = username;
        if (email !== undefined) updateData.email = email;

        // Hash the password if provided
        if (password) {
          updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        // Update staff user
        await tx.user.update({
          where: { id },
          data: updateData,
        });

        // Update branch associations if provided
        if (branchIds !== undefined) {
          // Delete existing branch associations
          await tx.userBranch.deleteMany({
            where: { userId: id },
          });

          // Create new branch associations
          if (branchIds.length > 0) {
            await tx.userBranch.createMany({
              data: branchIds.map((branchId) => ({
                userId: id,
                branchId,
              })),
            });
          }
        }

        // Return updated user with branch associations
        return tx.user.findUnique({
          where: { id },
          include: {
            branches: {
              include: {
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
      });

      if (!updatedStaff) {
        throw new Error("Failed to update staff");
      }

      // Format response using the helper function
      const formattedStaff = formatStaff(updatedStaff);

      return NextResponse.json({
        data: [formattedStaff],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating staff:", error);
      return NextResponse.json(
        { error: "Failed to update staff" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a staff
export const DELETE = withBranchAccess(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    const id = request.url.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "スタッフIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if staff exists
      const staff = await prisma.user.findUnique({
        where: { id },
      });

      if (!staff || staff.role !== "STAFF") {
        return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
      }

      // Prevent deleting if it's the currently logged in user
      if (staff.id === session.user?.id) {
        return NextResponse.json(
          { error: "自分のアカウントは削除できません" },
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
            error: `このスタッフは${branchAssignments}つの校舎に割り当てられているため削除できません。`,
            details: {
              branchAssignments
            }
          },
          { status: 400 }
        );
      }

      // Delete staff user
      await prisma.user.delete({ where: { id } });

      return NextResponse.json(
        {
          data: [],
          pagination: {
            total: 0,
            page: 0,
            limit: 0,
            pages: 0,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting staff:", error);
      return NextResponse.json(
        { error: "スタッフの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
