import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectTypeId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subjectTypeId } = await params;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the subject type with related data
    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
      include: {
        subjects: {
          select: {
            subjectId: true,
            name: true,
          },
        },
      },
    });

    if (!subjectType) {
      return Response.json(
        { error: "Subject type not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: subjectType });
  } catch (error) {
    console.error("Error fetching subject type:", error);
    return Response.json(
      { error: "Failed to fetch subject type" },
      { status: 500 }
    );
  }
}
