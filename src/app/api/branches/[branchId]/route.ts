// src/app/api/branches/[branchId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { branchUpdateSchema } from "@/schemas/branch.schema";
import { Branch, UserBranch } from "@prisma/client";

type BranchWithUsers = Branch & {
  userBranches: (UserBranch & {
    user: {
      id: string;
      name: string | null;
      username: string | null;
      email: string | null;
      role: string;
    };
  })[];
};

type FormattedBranch = {
  branchId: string;
  name: string;
  notes: string | null;
  users: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    role: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format branch response
const formatBranch = (branch: BranchWithUsers): FormattedBranch => ({
  branchId: branch.branchId,
  name: branch.name,
  notes: branch.notes,
  users: branch.userBranches.map((ub) => ub.user),
  createdAt: branch.createdAt,
  updatedAt: branch.updatedAt,
});

// GET a specific branch by ID
export const GET = withRole(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    const branchId = request.url.split("/").pop();

    if (!branchId) {
      return NextResponse.json(
        { error: "Branch ID is required" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { branchId },
      include: {
        userBranches: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Format response
    const formattedBranch = formatBranch(branch);

    return NextResponse.json({
      data: [formattedBranch],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a branch
export const PATCH = withRole(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    try {
      const branchId = request.url.split("/").pop();
      if (!branchId) {
        return NextResponse.json(
          { error: "Branch ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = branchUpdateSchema.safeParse({ ...body, branchId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if branch exists
      const existingBranch = await prisma.branch.findUnique({
        where: { branchId },
      });

      if (!existingBranch) {
        return NextResponse.json(
          { error: "Branch not found" },
          { status: 404 }
        );
      }

      const { name, notes, userIds } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingBranch.name) {
        const nameExists = await prisma.branch.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            branchId: { not: branchId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "Branch name already in use" },
            { status: 409 }
          );
        }
      }

      // Update branch and user associations in a transaction
      const updatedBranch = await prisma.$transaction(async (tx) => {
        // Update branch
        await tx.branch.update({
          where: { branchId },
          data: {
            name,
            notes,
          },
        });

        // Update user associations if provided
        if (userIds) {
          // Delete existing user-branch associations
          await tx.userBranch.deleteMany({
            where: { branchId },
          });

          // Create new user-branch associations
          if (userIds.length > 0) {
            await tx.userBranch.createMany({
              data: userIds.map((userId) => ({
                branchId,
                userId,
              })),
            });
          }
        }

        // Return updated branch with user associations
        return tx.branch.findUnique({
          where: { branchId },
          include: {
            userBranches: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
      });

      if (!updatedBranch) {
        throw new Error("Failed to update branch");
      }

      // Format response
      const formattedBranch = formatBranch(updatedBranch);

      return NextResponse.json({
        data: [formattedBranch],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating branch:", error);
      return NextResponse.json(
        { error: "Failed to update branch" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a branch
export const DELETE = withRole(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    const branchId = request.url.split("/").pop();

    if (!branchId) {
      return NextResponse.json(
        { error: "Branch ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if branch exists
      const branch = await prisma.branch.findUnique({
        where: { branchId },
        include: {
          booths: { take: 1 }, // Check if there are any associated booths
        },
      });

      if (!branch) {
        return NextResponse.json(
          { error: "Branch not found" },
          { status: 404 }
        );
      }

      // Prevent deletion if branch has associated booths
      if (branch.booths.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete branch with associated booths" },
          { status: 400 }
        );
      }

      // Delete branch in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete user-branch associations first
        await tx.userBranch.deleteMany({
          where: { branchId },
        });

        // Delete the branch
        await tx.branch.delete({
          where: { branchId },
        });
      });

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
      console.error("Error deleting branch:", error);
      return NextResponse.json(
        { error: "Failed to delete branch" },
        { status: 500 }
      );
    }
  }
);
