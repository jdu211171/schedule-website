import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { LineChannelService } from "@/services/line-channel.service";
import { z } from "zod";

const unassignChannelSchema = z.object({
  branchId: z.string().min(1),
  channelType: z.enum(["TEACHER", "STUDENT"]),
});

// POST /api/admin/line-channels/unassign - Remove a channel type assignment from a branch
export const POST = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = unassignChannelSchema.parse(body);

    await LineChannelService.unassignChannelType(
      validatedData.branchId,
      validatedData.channelType
    );

    return NextResponse.json({
      message: `${validatedData.channelType} channel unassigned successfully`,
    });
  } catch (error) {
    console.error("Error unassigning channel type:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Branch not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof Error &&
      error.message === "No channel assigned for this type"
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to unassign channel type" },
      { status: 500 }
    );
  }
});
