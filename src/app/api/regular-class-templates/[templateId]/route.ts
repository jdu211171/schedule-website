// app/api/regular-class-templates/[templateId]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templateId = params.templateId;

    // Fetch the template with related data
    const template = await prisma.regularClassTemplate.findUnique({
      where: { templateId },
      include: {
        teacher: true,
        subject: true,
        booth: true,
        templateStudentAssignments: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    return Response.json({ data: template });
  } catch (error) {
    console.error("Error fetching template:", error);
    return Response.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
