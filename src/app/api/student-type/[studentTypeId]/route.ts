import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { studentTypeId: string } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const studentTypeId = params.studentTypeId;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the student type with related data
    const studentType = await prisma.studentType.findUnique({
      where: { studentTypeId },
      include: {
        Grade: {
          select: {
            gradeId: true,
            name: true,
            gradeYear: true,
          },
        },
      },
    });

    if (!studentType) {
      return Response.json(
        { error: "Student type not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: studentType });
  } catch (error) {
    console.error("Error fetching student type:", error);
    return Response.json(
      { error: "Failed to fetch student type" },
      { status: 500 }
    );
  }
}
