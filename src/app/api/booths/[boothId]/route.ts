// src/app/api/booths/[boothId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { boothUpdateSchema } from "@/schemas/booth.schema";
import { Booth } from "@prisma/client";

type FormattedBooth = {
  boothId: string;
  branchId: string;
  branchName: string;
  name: string;
  status: boolean;
  notes: string | null;
  order: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format booth response
const formatBooth = (
  booth: Booth & { branch: { name: string } }
): FormattedBooth => ({
  boothId: booth.boothId,
  branchId: booth.branchId,
  branchName: booth.branch.name,
  name: booth.name,
  status: booth.status ?? true,
  notes: booth.notes,
  order: booth.order,
  createdAt: booth.createdAt,
  updatedAt: booth.updatedAt,
});

// GET a specific booth by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const boothId = request.url.split("/").pop();

    if (!boothId) {
      return NextResponse.json(
        { error: "ブースIDが必要です" },
        { status: 400 }
      );
    }

    const booth = await prisma.booth.findUnique({
      where: { boothId },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!booth) {
      return NextResponse.json(
        { error: "ブースが見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this booth's branch
    if (booth.branchId !== branchId && session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "このブースにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Format response
    const formattedBooth = formatBooth(booth);

    return NextResponse.json({
      data: formattedBooth,
    });
  }
);

// PATCH - Update a booth
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const boothId = request.url.split("/").pop();
      if (!boothId) {
        return NextResponse.json(
          { error: "ブースIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = boothUpdateSchema.safeParse({ ...body, boothId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if booth exists
      const existingBooth = await prisma.booth.findUnique({
        where: { boothId },
      });

      if (!existingBooth) {
        return NextResponse.json(
          { error: "ブースが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this booth's branch
      if (
        existingBooth.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このブースにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const { name, status, notes, order } = result.data;

      // Check name uniqueness if being updated
      if (name && name !== existingBooth.name) {
        const nameExists = await prisma.booth.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            branchId: existingBooth.branchId,
            boothId: { not: boothId },
          },
        });

        if (nameExists) {
          return NextResponse.json(
            { error: "このブース名はすでに使用されています" },
            { status: 409 }
          );
        }
      }

      // Update booth
      const updatedBooth = await prisma.booth.update({
        where: { boothId },
        data: {
          name,
          status,
          notes,
          order,
        },
        include: {
          branch: {
            select: {
              name: true,
            },
          },
        },
      });

      // Format response
      const formattedBooth = formatBooth(updatedBooth);

      return NextResponse.json({
        data: [formattedBooth],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating booth:", error);
      return NextResponse.json(
        { error: "ブースの更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a booth
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const boothId = request.url.split("/").pop();

    if (!boothId) {
      return NextResponse.json(
        { error: "ブースIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if booth exists
      const booth = await prisma.booth.findUnique({
        where: { boothId },
        include: {
          classSessions: { take: 1 }, // Check if there are any associated class sessions
        },
      });

      if (!booth) {
        return NextResponse.json(
          { error: "ブースが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this booth's branch
      if (booth.branchId !== branchId && session.user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "このブースにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the booth (ClassSession.boothId will be set to null automatically)
      await prisma.booth.delete({
        where: { boothId },
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
      console.error("Error deleting booth:", error);
      return NextResponse.json(
        { error: "ブースの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
