// app/api/regular-class-templates/[templateId]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { templateId } = await params;

    // Fetch the template with related data
    const template = await prisma.regularClassTemplate.findUnique({
      where: { templateId },
      include: {
        teacher: true,
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
        booth: true,
        templateStudentAssignments: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!template) {
      return Response.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }

    return Response.json({ data: template });
  } catch (error) {
    console.error("テンプレート取得中にエラーが発生しました:", error);
    return Response.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
