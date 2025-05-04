import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId } = await params;

    // No need for explicit schema validation here, as Next.js' dynamic route
    // parameter already guarantees we have a string

    // Fetch the student with related data
    const student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        grade: true,
        studentClassEnrollments: {
          include: {
            classSession: {
              include: {
                subject: true,
                booth: true,
                teacher: true,
              },
            },
          },
        },
        StudentPreference: {
          include: {
            classType: true,
            subjects: {
              include: {
                subject: true,
              },
            },
            teachers: {
              include: {
                teacher: true,
              },
            },
            timeSlots: true,
          },
        },
      },
    });

    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    return Response.json({ data: student });
  } catch (error) {
    console.error("Error fetching student:", error);
    return Response.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
