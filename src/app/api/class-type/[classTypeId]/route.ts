import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { classTypeId: string } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const classTypeId = params.classTypeId;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the class type
    const classType = await prisma.classType.findUnique({
      where: { classTypeId },
    });

    if (!classType) {
      return Response.json({ error: "Class type not found" }, { status: 404 });
    }

    return Response.json({ data: classType });
  } catch (error) {
    console.error("Error fetching class type:", error);
    return Response.json(
      { error: "Failed to fetch class type" },
      { status: 500 }
    );
  }
}
