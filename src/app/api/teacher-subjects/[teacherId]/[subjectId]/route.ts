import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      teacherId: string;
      subjectId: string;
    }>;
  }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teacherId, subjectId: subjectIdFromPath } = await params;

    const { searchParams } = new URL(request.url);
    const subjectTypeIdFromQuery = searchParams.get("subjectTypeId");

    if (!subjectTypeIdFromQuery) {
      return Response.json(
        { error: "subjectTypeId query parameter is required" },
        { status: 400 }
      );
    }

    const teacherSubject = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId,
          subjectId: subjectIdFromPath,
          subjectTypeId: subjectTypeIdFromQuery,
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

    if (!teacherSubject) {
      return Response.json(
        { error: "講師-科目関連が見つかりません (指定されたteacherIdとsubjectTypeIdの組に該当するレコードがありません)" },
        { status: 404 }
      );
    }

    if (teacherSubject.subjectId !== subjectIdFromPath) {
      return Response.json(
        { error: "講師-科目関連が見つかりません (指定されたsubjectIdがレコードと一致しません)" },
        { status: 404 }
      );
    }

    return Response.json({ data: teacherSubject });
  } catch (error: unknown) {
    console.error("Error fetching teacher-subject relationship:", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return Response.json(
      { error: "講師-科目関連の取得に失敗しました", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: {
    params: Promise<{
      teacherId: string;
      subjectId: string;
    }>;
  }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let subjectTypeIdFromBody: string | undefined;

  try {
    const { teacherId: teacherIdFromPath, subjectId: subjectIdFromPath } = await params;
    const body = await request.json();

    subjectTypeIdFromBody = body.subjectTypeId;

    if (!subjectTypeIdFromBody || typeof subjectTypeIdFromBody !== 'string' || subjectTypeIdFromBody.trim() === '') {
      return Response.json(
        { error: "subjectTypeId is required in the request body and must be a non-empty string" },
        { status: 400 }
      );
    }

    const dataForCreation: Prisma.TeacherSubjectCreateInput = {
      teacher: { connect: { teacherId: teacherIdFromPath } },
      subject: { connect: { subjectId: subjectIdFromPath } },
      subjectType: { connect: { subjectTypeId: subjectTypeIdFromBody } },
    };

    const newTeacherSubject = await prisma.teacherSubject.create({
      data: dataForCreation,
    });

    return Response.json({ data: newTeacherSubject }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating teacher-subject relationship:", error);
    let errorMessage = "講師-科目関連の作成に失敗しました";
    let details: string | unknown = "不明なエラーが発生しました";
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      details = error.message;
      if (error.code === 'P2002') {
        errorMessage = "この講師と科目の種類の組み合わせは既に存在します。";
        const awaitedParams = await params;
        const targetFields = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(', ') : String(error.meta?.target);
        details = `A record with teacherId '${awaitedParams.teacherId}' and subjectTypeId '${subjectTypeIdFromBody}' already exists. Unique constraint violated on fields: ${targetFields}.`;
        statusCode = 409;
      } else if (error.code === 'P2003') {
        errorMessage = "関連データが見つかりません。";
        const fieldName = String(error.meta?.field_name) || "related field";
        details = `The specified teacherId, subjectId, or subjectTypeId does not exist in the related tables. Foreign key constraint failed on field: ${fieldName}.`;
        statusCode = 400;
      }
    } else if (error instanceof Error) {
      details = error.message;
    }

    return Response.json(
      { error: errorMessage, details: details },
      { status: statusCode }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: {
    params: Promise<{
      teacherId: string;
      subjectId: string;
    }>;
  }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teacherId: teacherIdFromPath, subjectId: originalSubjectIdFromPath } = await params;
    const { searchParams } = new URL(request.url);
    const subjectTypeIdFromQuery = searchParams.get("subjectTypeId");

    if (!subjectTypeIdFromQuery) {
      return Response.json(
        { error: "subjectTypeId query parameter is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const dataToUpdate: Prisma.TeacherSubjectUpdateInput = {};

    // Handle subjectId update
    if (body.hasOwnProperty('subjectId')) {
      if (typeof body.subjectId === 'string' && body.subjectId.trim() !== '') {
        dataToUpdate.subject = { connect: { subjectId: body.subjectId } };
      } else if (body.subjectId !== undefined) { // Allow empty string if that's a valid case or handle as error
        return Response.json({ error: "New subjectId must be a non-empty string if provided" }, { status: 400 });
      }
    }

    // Handle notes update (allows string, null, or undefined)
    // Zod schema allows null to clear notes, or undefined to leave unchanged.
    if (body.hasOwnProperty('notes')) {
      if (typeof body.notes === 'string' || body.notes === null) {
        dataToUpdate.notes = body.notes;
      } else if (body.notes !== undefined) {
        return Response.json({ error: "Notes must be a string or null if provided" }, { status: 400 });
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return Response.json({ error: "No valid update data provided (e.g., new subjectId or notes missing)" }, { status: 400 });
    }

    const existingTeacherSubject = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId: teacherIdFromPath,
          subjectId: originalSubjectIdFromPath,
          subjectTypeId: subjectTypeIdFromQuery,
        },
      },
    });

    if (!existingTeacherSubject) {
      return Response.json(
        { error: "講師-科目関連が見つかりません (指定されたteacherIdとsubjectTypeIdの組に該当するレコードがありません)" },
        { status: 404 }
      );
    }

    if (existingTeacherSubject.subjectId !== originalSubjectIdFromPath) {
      return Response.json(
        { error: "講師-科目関連が見つかりません (URLのsubjectIdがレコードの現在のsubjectIdと一致しません)" },
        { status: 400 } // Mismatch, bad request
      );
    }

    const updatedTeacherSubject = await prisma.teacherSubject.update({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId: teacherIdFromPath,
          subjectId: originalSubjectIdFromPath,
          subjectTypeId: subjectTypeIdFromQuery,
        },
      },
      data: dataToUpdate,
    });

    return Response.json({ data: updatedTeacherSubject });
  } catch (error: unknown) {
    console.error("Error updating teacher-subject relationship:", error);
    let errorMessage = "講師-科目関連の更新に失敗しました";
    let details: string | unknown = "不明なエラーが発生しました";
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      details = error.message;
      if (error.code === 'P2025') { // Record to update not found (should be caught by findUnique earlier, but good to have)
        errorMessage = "更新対象のレコードが見つかりません。";
        statusCode = 404;
      } else if (error.code === 'P2003') { // Foreign key constraint failed (e.g. new subjectId doesn't exist)
        errorMessage = "関連データが見つかりません。";
        const fieldName = String(error.meta?.field_name) || "related field";
        details = `The new subjectId or other related data does not exist. Foreign key constraint failed on field: ${fieldName}.`;
        statusCode = 400;
      }
    } else if (error instanceof Error) {
      details = error.message;
    }

    return Response.json(
      { error: errorMessage, details: details },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  request: Request, // Keep request parameter for consistency, even if not directly used
  { params }: {
    params: Promise<{
      teacherId: string;
      subjectId: string;
    }>;
  }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teacherId: teacherIdFromPath, subjectId: subjectIdFromPath } = await params;
    const { searchParams } = new URL(request.url);
    const subjectTypeIdFromQuery = searchParams.get("subjectTypeId");

    if (!subjectTypeIdFromQuery) {
      return Response.json(
        { error: "subjectTypeId query parameter is required" },
        { status: 400 }
      );
    }

    const teacherSubjectToDelete = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId: teacherIdFromPath,
          subjectId: subjectIdFromPath,
          subjectTypeId: subjectTypeIdFromQuery,
        },
      },
    });

    if (!teacherSubjectToDelete) {
      return Response.json(
        { error: "講師-科目関連が見つかりません (指定されたteacherIdとsubjectTypeIdの組に該当するレコードがありません)" },
        { status: 404 }
      );
    }

    if (teacherSubjectToDelete.subjectId !== subjectIdFromPath) {
      return Response.json(
        { error: "講師-科目関連が見つかりません (指定されたsubjectIdがレコードと一致しません)" },
        { status: 400 }
      );
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId_subjectTypeId: {
          teacherId: teacherIdFromPath,
          subjectId: subjectIdFromPath,
          subjectTypeId: subjectTypeIdFromQuery,
        },
      },
    });

    return Response.json({ message: "講師-科目関連が正常に削除されました" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error deleting teacher-subject relationship:", error);
    let errorMessage = "講師-科目関連の削除に失敗しました";
    let details: string | unknown = "不明なエラーが発生しました";
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      details = error.message;
      if (error.code === 'P2025') {
        errorMessage = "削除対象のレコードが見つかりません。";
        statusCode = 404;
      }
    } else if (error instanceof Error) {
      details = error.message;
    }

    return Response.json(
      { error: errorMessage, details: details },
      { status: statusCode }
    );
  }
}
