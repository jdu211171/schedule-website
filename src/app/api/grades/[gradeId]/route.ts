import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { gradeId: string } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gradeId = params.gradeId;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the grade with related data
    const grade = await prisma.grade.findUnique({
      where: { gradeId },
      include: {
        studentType: true,
      },
    });

    if (!grade) {
      return Response.json({ error: "Grade not found" }, { status: 404 });
    }

    return Response.json({ data: grade });
  } catch (error) {
    console.error("Error fetching grade:", error);
    return Response.json({ error: "Failed to fetch grade" }, { status: 500 });
  }
}
