import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params; // Added await here

    // Fetch the student-subject relationship with related data
    const studentPreferenceSubject =
      await prisma.studentPreferenceSubject.findUnique({
        where: {
          id,
        },
        include: {
          studentPreference: {
            include: {
              student: {
                select: {
                  studentId: true,
                  name: true,
                },
              },
            },
          },
          subject: {
            select: {
              subjectId: true,
              name: true,
              subjectToSubjectTypes: {
                include: {
                  subjectType: true,
                },
              },
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

    if (!studentPreferenceSubject) {
      return Response.json(
        { error: "生徒科目関連が見つかりません" },
        { status: 404 }
      );
    }

    return Response.json({ data: studentPreferenceSubject });
  } catch (error) {
    console.error("Error fetching student-subject relationship:", error);
    return Response.json(
      { error: "生徒科目関連の取得に失敗しました" },
      { status: 500 }
    );
  }
}
