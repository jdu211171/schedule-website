import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { LineChannelService } from "@/services/line-channel.service";

// POST /api/admin/line-channels/[channelId]/test - Test LINE channel
export const POST = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const segments = req.url.split("/");
    const channelId = segments[segments.length - 2]; // Get channelId from URL path

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID not provided" },
        { status: 400 }
      );
    }

    const { testUserId } = await req.json();

    const result = await LineChannelService.testChannel(channelId, testUserId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing LINE channel:", error);

    if (error instanceof Error) {
      if (error.message === "Channel not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.message.includes("Invalid credentials")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Failed to test LINE channel" },
      { status: 500 }
    );
  }
});
