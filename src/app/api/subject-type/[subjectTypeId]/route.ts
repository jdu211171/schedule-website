import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectTypeId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subjectTypeId } = await params;

    // Fetch the subject type with related data
    const subjectType = await prisma.subjectType.findUnique({
      where: { subjectTypeId },
      include: {
        subjectToSubjectTypes: {
          include: {
            subject: {
              select: {
                subjectId: true,
                name: true,
              },
            },
          },
        },
        StudentPreferenceSubject: {
          select: {
            id: true,
            studentPreferenceId: true,
            subjectId: true,
          },
          take: 10, // Limit to prevent large response payloads
        },
      },
    });

    if (!subjectType) {
      return Response.json(
        { error: "科目タイプが見つかりません" },
        { status: 404 }
      );
    }

    return Response.json({ data: subjectType });
  } catch (error) {
    console.error("Error fetching subject type:", error);
    return Response.json(
      { error: "科目タイプの取得に失敗しました" },
      { status: 500 }
    );
  }
}
