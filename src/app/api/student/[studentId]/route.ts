import { prisma } from "@/lib/prisma";
import { StudentIdSchema } from "@/schemas/student.schema";
import { ZodError } from "zod";

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    // Validate the studentId
    const { studentId } = StudentIdSchema.parse(params);

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
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid student ID", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
