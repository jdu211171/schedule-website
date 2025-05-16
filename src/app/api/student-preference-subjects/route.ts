import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  StudentPreferenceSubjectQuerySchema,
  CreateStudentPreferenceSubjectSchema,
  UpdateStudentPreferenceSubjectSchema,
} from "@/schemas/student-preference-subject.schema";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = StudentPreferenceSubjectQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const {
      page,
      limit,
      studentId,
      subjectId,
      subjectTypeId,
      preferenceId,
      sort,
      order,
    } = query;

    const filters: Record<string, unknown> = {};

    if (subjectId) {
      filters.subjectId = subjectId;
    }

    if (subjectTypeId) {
      filters.subjectTypeId = subjectTypeId;
    }

    if (preferenceId) {
      filters.studentPreferenceId = preferenceId;
    }

    // First find all students that have preferences matching our filters
    const students = await prisma.student.findMany({
      where: {
        StudentPreference: {
          some: {
            subjects: {
              some: filters,
            },
          },
        },
      },
      select: {
        studentId: true,
        name: true,
      },
      orderBy: {
        name: order as "asc" | "desc",
      },
    });

    const total = students.length;

    // Apply pagination to students
    const paginatedStudents = students.slice((page - 1) * limit, page * limit);
    const paginatedStudentIds = paginatedStudents.map((s) => s.studentId);

    // Get all preference IDs for these students
    const studentPreferences = await prisma.studentPreference.findMany({
      where: {
        studentId: { in: paginatedStudentIds },
      },
      select: { preferenceId: true },
    });

    const preferenceIds = studentPreferences.map((pref) => pref.preferenceId);

    // Now get all subject preferences for these students
    const studentPreferenceSubjects =
      await prisma.studentPreferenceSubject.findMany({
        where: {
          studentPreferenceId: { in: preferenceIds },
          ...(subjectId ? { subjectId } : {}),
          ...(subjectTypeId ? { subjectTypeId } : {}),
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
              name: true,
            },
          },
          subjectType: {
            select: {
              name: true,
            },
          },
        },
      });

    return Response.json({
      data: studentPreferenceSubjects,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("生徒の科目設定の取得エラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return Response.json(
      {
        error: "生徒の科目設定の取得に失敗しました",
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const body = await request.json();
    const data = CreateStudentPreferenceSubjectSchema.parse(body);

    // Determine if we're dealing with single or multiple subject types
    const hasMultipleSubjectTypes =
      "subjectTypeIds" in data && Array.isArray(data.subjectTypeIds);
    const { studentId, subjectId, preferenceId } = data;

    // Get subject type IDs (either from array or single value)
    const subjectTypeIds = hasMultipleSubjectTypes
      ? (data.subjectTypeIds as string[])
      : [("subjectTypeId" in data ? data.subjectTypeId : "") as string];

    // Check if the student exists
    const student = await prisma.student.findUnique({
      where: { studentId },
    });
    if (!student) {
      return Response.json({ error: "学生が見つかりません" }, { status: 404 }); // "Student not found"
    }

    // Check if the subject exists
    const subject = await prisma.subject.findUnique({
      where: { subjectId },
    });
    if (!subject) {
      return Response.json({ error: "科目が見つかりません" }, { status: 404 }); // "Subject not found"
    }

    // Get or create the student preference
    let preference;
    if (preferenceId) {
      preference = await prisma.studentPreference.findUnique({
        where: { preferenceId },
      });

      if (!preference) {
        return Response.json(
          { error: "指定された生徒の設定が見つかりません" }, // "Specified student preference not found"
          { status: 404 }
        );
      }

      // Make sure the preference belongs to the student
      if (preference.studentId !== studentId) {
        return Response.json(
          { error: "この生徒設定は指定された生徒のものではありません" }, // "This student preference does not belong to the specified student"
          { status: 403 }
        );
      }
    } else {
      // Create a new preference if not provided
      preference = await prisma.studentPreference.create({
        data: {
          studentId,
        },
      });
    }

    const createdRecords = [];
    const errors = [];

    // Process each subject type ID
    for (const subjectTypeId of subjectTypeIds) {
      try {
        // Check if the subject type exists
        const subjectType = await prisma.subjectType.findUnique({
          where: { subjectTypeId },
        });
        if (!subjectType) {
          errors.push(`科目タイプID ${subjectTypeId} が見つかりません`);
          continue;
        }

        // Check if the subject-subject type combination is valid
        const validPair = await prisma.subjectToSubjectType.findFirst({
          where: {
            subjectId,
            subjectTypeId,
          },
        });

        if (!validPair) {
          errors.push(
            `科目ID ${subjectId} と科目タイプID ${subjectTypeId} の組み合わせは有効ではありません`
          );
          continue;
        }

        // Check if the studentPreference-subjectType relation already exists
        const existingPreferenceSubjectTypeRelation =
          await prisma.studentPreferenceSubject.findFirst({
            where: {
              studentPreferenceId: preference.preferenceId,
              subjectTypeId,
            },
          });

        if (existingPreferenceSubjectTypeRelation) {
          errors.push(
            `この生徒の希望には、科目タイプID ${subjectTypeId} の科目が既に設定されています`
          );
          continue;
        }

        // Create the record
        const studentPreferenceSubject =
          await prisma.studentPreferenceSubject.create({
            data: {
              studentPreferenceId: preference.preferenceId,
              subjectId,
              subjectTypeId,
            },
          });

        createdRecords.push(studentPreferenceSubject);
      } catch (error) {
        console.error(
          `科目タイプ ${subjectTypeId} の処理中にエラーが発生しました:`,
          error
        );
        errors.push(
          `科目タイプ ${subjectTypeId} の処理中にエラーが発生しました`
        );
      }
    }

    // If no records were created but we had errors, return the first error
    if (createdRecords.length === 0 && errors.length > 0) {
      return Response.json({ error: errors[0] }, { status: 400 });
    }

    // Return success with created records and any errors
    return Response.json(
      {
        message: `${createdRecords.length} 件の生徒の科目設定が正常に作成されました`,
        data: createdRecords,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    console.error("生徒の科目設定の作成エラー:", error); // "Error creating student preference subject:"
    return Response.json(
      { error: "生徒の科目設定の作成に失敗しました" }, // "Failed to create student preference subject"
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const body = await request.json();
    const { id, notes } = UpdateStudentPreferenceSubjectSchema.parse(body);

    // Check if the relation exists
    const existingRelation = await prisma.studentPreferenceSubject.findUnique({
      where: { id },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "生徒の科目設定が見つかりません" }, // "Student preference subject not found"
        { status: 404 }
      );
    }

    const studentPreferenceSubject =
      await prisma.studentPreferenceSubject.update({
        where: { id },
        data: {},
      });

    return Response.json({
      message: "生徒の科目設定が正常に更新されました", // "Student preference subject updated successfully"
      data: studentPreferenceSubject,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "入力値の検証に失敗しました", details: error.errors }, // "Validation failed"
        { status: 400 }
      );
    }
    console.error("生徒の科目設定の更新エラー:", error); // "Error updating student preference subject:"
    return Response.json(
      { error: "生徒の科目設定の更新に失敗しました" }, // "Failed to update student preference subject"
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "権限がありません" }, { status: 401 }); // "Unauthorized"
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "禁止されています" }, { status: 403 }); // "Forbidden"
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "IDは必須です" }, { status: 400 }); // "ID is required"
    }

    const existingRelation = await prisma.studentPreferenceSubject.findUnique({
      where: { id },
    });

    if (!existingRelation) {
      return Response.json(
        { error: "生徒の科目設定が見つかりません" }, // "Student preference subject not found"
        { status: 404 }
      );
    }

    await prisma.studentPreferenceSubject.delete({
      where: { id },
    });

    return Response.json({
      message: "生徒の科目設定が正常に削除されました", // "Student preference subject deleted successfully"
    });
  } catch (error) {
    console.error("生徒の科目設定の削除エラー:", error); // "Error deleting student preference subject:"
    return Response.json(
      { error: "生徒の科目設定の削除に失敗しました" }, // "Failed to delete student preference subject"
      { status: 500 }
    );
  }
}
