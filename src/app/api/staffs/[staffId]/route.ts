// src/app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
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
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format staff response with proper typing
const formatStaff = (staff: User): FormattedStaff => ({
  id: staff.id,
  name: staff.name,
  username: staff.username,
  email: staff.email,
  role: staff.role,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

// GET a specific staff by ID
export const GET = withRole(
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
export const PATCH = withRole(
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

      const { username, password, email, name } = result.data;

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
      const updatedStaff = await prisma.user.update({
        where: { id },
        data: updateData,
      });

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
export const DELETE = withRole(
  ["ADMIN"],
  async (request: NextRequest, session) => {
    const id = request.url.split("/").pop();

    if (!id) {
      return NextResponse.json(
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if staff exists
      const staff = await prisma.user.findUnique({
        where: { id },
      });

      if (!staff || staff.role !== "STAFF") {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }

      // Prevent deleting if it's the currently logged in user
      if (staff.id === session.user?.id) {
        return NextResponse.json(
          { error: "Cannot delete your own account" },
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
        { error: "Failed to delete staff" },
        { status: 500 }
      );
    }
  }
);
