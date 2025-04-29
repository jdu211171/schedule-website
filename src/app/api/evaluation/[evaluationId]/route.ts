import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { evaluationId: string } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const evaluationId = params.evaluationId;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the evaluation
    const evaluation = await prisma.evaluation.findUnique({
      where: { evaluationId },
      include: {
        teachers: {
          select: {
            teacherId: true,
            name: true,
          },
        },
      },
    });

    if (!evaluation) {
      return Response.json({ error: "Evaluation not found" }, { status: 404 });
    }

    return Response.json({ data: evaluation });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return Response.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
}
