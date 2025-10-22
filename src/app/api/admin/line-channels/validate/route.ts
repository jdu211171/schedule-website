import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { LineChannelService } from "@/services/line-channel.service";

// GET /api/admin/line-channels/validate - Validate channel type assignments
export const GET = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const validation = await LineChannelService.validateChannelTypes();

    return NextResponse.json({
      data: validation,
      message: validation.isValid
        ? "All branches have valid channel type assignments"
        : "Some branches have multiple channels of the same type",
    });
  } catch (error) {
    console.error("Error validating channel assignments:", error);
    return NextResponse.json(
      { error: "Failed to validate channel assignments" },
      { status: 500 }
    );
  }
});
