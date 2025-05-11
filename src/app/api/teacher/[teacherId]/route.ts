import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teacherId } = await params;

    // Fetch the teacher with related data
    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
      include: {
        evaluation: true,
        teacherSubjects: {
          include: {
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
          },
        },
        TeacherShiftReference: true,
        classSessions: {
          include: {
            subject: {
              include: {
                subjectToSubjectTypes: {
                  include: {
                    subjectType: true,
                  },
                },
              },
            },
            booth: true,
            student: true,
          },
        },
      },
    });

    if (!teacher) {
      return Response.json({ error: "Teacher not found" }, { status: 404 });
    }

    return Response.json({ data: teacher });
  } catch (error) {
    console.error("Error fetching teacher:", error);
    return Response.json({ error: "Failed to fetch teacher" }, { status: 500 });
  }
}
