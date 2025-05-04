import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teacherId: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teacherId, subjectId } = await params;

    // Fetch the teacher-subject relationship with related data
    const teacherSubject = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
      include: {
        teacher: {
          select: {
            teacherId: true,
            name: true,
            email: true,
          },
        },
        subject: {
          select: {
            subjectId: true,
            name: true,
            subjectType: true,
          },
        },
      },
    });

    if (!teacherSubject) {
      return Response.json(
        { error: "Teacher-subject relationship not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: teacherSubject });
  } catch (error) {
    console.error("Error fetching teacher-subject relationship:", error);
    return Response.json(
      { error: "Failed to fetch teacher-subject relationship" },
      { status: 500 }
    );
  }
}
