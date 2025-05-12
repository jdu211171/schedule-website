import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Fetch the event
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    return Response.json({ data: event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return Response.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
