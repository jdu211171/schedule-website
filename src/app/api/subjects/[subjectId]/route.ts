import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subjectId } = await params;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the subject with all related data as defined in SubjectWithRelations
    const subject = await prisma.subject.findUnique({
      where: { subjectId },
      include: {
        subjectType: true,
        subjectToSubjectTypes: true,
        classSessions: { include: { classType: true } },
        regularClassTemplates: true,
        teacherSubjects: true,
        StudentPreferenceSubject: true,
      },
    });

    if (!subject) {
      return Response.json({ error: "Subject not found" }, { status: 404 });
    }

    return Response.json({ data: subject });
  } catch (error) {
    console.error("Error fetching subject:", error);
    return Response.json({ error: "Failed to fetch subject" }, { status: 500 });
  }
}
