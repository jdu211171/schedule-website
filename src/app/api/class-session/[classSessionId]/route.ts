import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classSessionId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { classSessionId } = await params;
    const classId = classSessionId;

    // Fetch the class session with related data
    const classSession = await prisma.classSession.findUnique({
      where: { classId },
      include: {
        booth: true,
        classType: true,
        subject: {
          include: {
            subjectToSubjectTypes: {
              include: {
                subjectType: true,
              },
            },
          },
        },
        subjectType: true,
        teacher: true,
        student: true,
        regularClassTemplate: true,
        studentClassEnrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!classSession) {
      return Response.json(
        { error: "Class session not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: classSession });
  } catch (error) {
    console.error("Error fetching class session:", error);
    return Response.json(
      { error: "Failed to fetch class session" },
      { status: 500 }
    );
  }
}
