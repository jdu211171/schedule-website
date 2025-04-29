import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { boothId: string } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const boothId = params.boothId;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the booth
    const booth = await prisma.booth.findUnique({
      where: { boothId },
    });

    if (!booth) {
      return Response.json({ error: "Booth not found" }, { status: 404 });
    }

    return Response.json({ data: booth });
  } catch (error) {
    console.error("Error fetching booth:", error);
    return Response.json({ error: "Failed to fetch booth" }, { status: 500 });
  }
}
