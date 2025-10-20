// src/app/api/shared-availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { findSharedAvailability } from "@/lib/shared-availability";
import { z } from "zod";

const sharedAvailabilitySchema = z.object({
  user1Id: z.string(),
  user2Id: z.string(),
  date: z.string(), // YYYY-MM-DD format
});

// GET - Find shared availability between two users
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"],
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());

      // Validate parameters
      const result = sharedAvailabilitySchema.safeParse(params);
      if (!result.success) {
        return NextResponse.json(
          {
            error: "Invalid parameters",
            details: result.error.errors,
          },
          { status: 400 }
        );
      }

      const { user1Id, user2Id, date: dateString } = result.data;
      const date = new Date(dateString + "T00:00:00.000Z");

      // Find shared availability
      const sharedAvailability = await findSharedAvailability(
        user1Id,
        user2Id,
        date
      );

      return NextResponse.json({
        success: true,
        data: sharedAvailability,
        requestedDate: dateString,
        users: {
          user1Id,
          user2Id,
        },
      });
    } catch (error) {
      console.error("Error finding shared availability:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
