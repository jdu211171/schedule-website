import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      teacherId: string;
      subjectId: string;
      subjectTypeId: string;
    }>;
  }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teacherId, subjectId, subjectTypeId } = await params;

    // Fetch the teacher-subject relationship with related data
    const teacherSubject = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId,
          subjectTypeId,
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
        subjectType: {
          select: {
            subjectTypeId: true,
            name: true,
          },
        },
      },
    });

    if (!teacherSubject) {
      return Response.json(
        { error: "講師-科目関連が見つかりません" },
        { status: 404 }
      );
    }

    return Response.json({ data: teacherSubject });
  } catch (error) {
    console.error("Error fetching teacher-subject relationship:", error);
    return Response.json(
      { error: "講師-科目関連の取得に失敗しました" },
      { status: 500 }
    );
  }
}
