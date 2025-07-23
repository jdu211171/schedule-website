import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const branchSettingsSchema = z.object({
  archiveRetentionMonths: z.number().min(1).max(120), // 1 month to 10 years
});

// GET /api/settings/branch
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session: any, selectedBranchId: string | null) => {
    try {
      // Always get global settings (ignoring branch context)
      const settings = await prisma.branchSettings.findFirst({
        where: { branchId: null },
        select: {
          id: true,
          branchId: true,
          archiveRetentionMonths: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // If no settings exist, return default
      if (!settings) {
        return NextResponse.json({
          data: {
            id: null,
            branchId: null,
            archiveRetentionMonths: 6, // Default 6 months
            isDefault: true,
            isGlobal: true,
          },
        });
      }

      return NextResponse.json({
        data: {
          ...settings,
          isDefault: false,
          isGlobal: true,
        },
      });
    } catch (error) {
      console.error("Error fetching branch settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch branch settings" },
        { status: 500 }
      );
    }
  }
);

// PUT /api/settings/branch
export const PUT = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (req: NextRequest, session: any, selectedBranchId: string | null) => {
    try {
      const body = await req.json();
      const validatedData = branchSettingsSchema.parse(body);

      // Always use global settings (branch_id = null)
      // First check if global settings exist
      const existingSettings = await prisma.branchSettings.findFirst({
        where: { branchId: null },
      });

      let settings;
      if (existingSettings) {
        // Update existing global settings
        settings = await prisma.branchSettings.update({
          where: { id: existingSettings.id },
          data: {
            archiveRetentionMonths: validatedData.archiveRetentionMonths,
          },
          select: {
            id: true,
            branchId: true,
            archiveRetentionMonths: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } else {
        // Create new global settings
        settings = await prisma.branchSettings.create({
          data: {
            branchId: null,
            archiveRetentionMonths: validatedData.archiveRetentionMonths,
          },
          select: {
            id: true,
            branchId: true,
            archiveRetentionMonths: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }

      return NextResponse.json({
        data: {
          ...settings,
          isGlobal: true,
        },
        message: "Global archive settings updated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid settings data", details: error.errors },
          { status: 400 }
        );
      }

      console.error("Error updating branch settings:", error);
      return NextResponse.json(
        { error: "Failed to update branch settings" },
        { status: 500 }
      );
    }
  }
);

// DELETE endpoint removed - global settings should not be deletable