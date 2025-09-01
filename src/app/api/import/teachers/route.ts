import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  teacherImportSchema,
  teacherUpdateImportSchema,
  type TeacherImportData,
  type TeacherUpdateImportData,
  type ImportResult,
  formatValidationErrors,
} from "@/schemas/import";
import { TEACHER_COLUMN_RULES, csvHeaderToDbField } from "@/schemas/import/teacher-column-rules";
import { z } from "zod";
import { handleImportError } from "@/lib/import-error-handler";
// Strict variant: ImportMode unused

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file");
    // Strict variant: per-row decision by presence of ID only

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await (file as Blob).arrayBuffer());

    // Parse CSV file with encoding detection
    const parseResult =
      await CSVParser.parseBuffer<Record<string, string>>(buffer, {
        encoding: "utf-8", // Default to UTF-8, but the parser will auto-detect if needed
      });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSVファイルの解析に失敗しました",
          details: parseResult.errors,
        },
        { status: 400 },
      );
    }

    // Validate CSV headers
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルが空です" },
        { status: 400 },
      );
    }

    const actualHeaders = Object.keys(parseResult.data[0]);

    // No global required header enforcement; validate per row

    // Process and validate each row
    const validatedData: ((TeacherImportData | TeacherUpdateImportData) & {
      branchIds?: string[];
      existingUserId?: string;
      fieldsInRow?: Set<string>;
      rowNumber: number;
    })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: [],
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
    };

    // Pre-fetch all branches for validation
    const allBranches = await prisma.branch.findMany({
      select: { branchId: true, name: true },
    });
    const branchMap = new Map(allBranches.map((b) => [b.name, b.branchId]));

    // Map CSV headers to DB fields for processing
    const headerMapping: Record<string, string> = {};
    for (const header of actualHeaders) {
      const dbField = csvHeaderToDbField(header);
      if (dbField) {
        headerMapping[header] = dbField;
      }
    }

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        // Detect update by presence of ID
        const importTeacherId = ((row as any).id || (row as any).ID) as string | undefined;

        // Map CSV data to DB fields and filter ignored columns
        const filteredRow: Record<string, string> = {};
        const fieldsInRow: Set<string> = new Set();

        for (const [csvHeader, csvValue] of Object.entries(row)) {
          const dbField = headerMapping[csvHeader];
          if (!dbField) continue;

          const rule = Object.values(TEACHER_COLUMN_RULES).find(r => r.dbField === dbField);
          if (!rule) continue;

          // Skip columns ignored for both create and update
          if (rule.createRule === 'ignore' && rule.updateRule === 'ignore') continue;

          // Map to internal field name for schema validation
          filteredRow[dbField] = csvValue;
          fieldsInRow.add(dbField);
        }

        // Validate row data with filtered columns using appropriate schema
        const isUpdateRow = !!importTeacherId;
        const validated = isUpdateRow
          ? teacherUpdateImportSchema.parse(filteredRow)
          : teacherImportSchema.parse(filteredRow);

        // Upsert semantics similar to student import:
        // If no explicit ID, try to find existing user by username/email to update
        let existingUser: any | null = null;
        if (!importTeacherId) {
          existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { username: validated.username },
                ...(validated.email ? [{ email: validated.email }] : []),
              ],
            },
            include: { teacher: true },
          });
        }

        // Validate branches
        let branchIds: string[] = [];
        if (validated.branches && validated.branches.length > 0) {
          const invalidBranches = validated.branches.filter(
            (name) => !branchMap.has(name),
          );
          if (invalidBranches.length > 0) {
            result.errors.push({
              row: rowNumber,
              errors: [`校舎が見つかりません: ${invalidBranches.join(", ")}`],
            });
            continue;
          }
          branchIds = validated.branches.map((name) => branchMap.get(name)!);
        } else if (!isUpdateRow) {
          // Branches are required for create mode if no existing user
          branchIds = [branchId]; // Default to current branch
        }

        // Decide if this row is an update or create
        if (isUpdateRow) {
          // Update by provided teacher ID
          validatedData.push({
            ...validated,
            branchIds,
            fieldsInRow,
            rowNumber,
            teacherId: importTeacherId,
          } as any);
        } else if (existingUser) {
          // Update existing teacher matched by username/email
          if (!existingUser.teacher) {
            result.errors.push({
              row: rowNumber,
              errors: [
                `ユーザー「${existingUser.username}」は講師ではありません`,
              ],
            });
            continue;
          }
          validatedData.push({
            ...validated,
            branchIds,
            fieldsInRow,
            rowNumber,
            existingUserId: existingUser.id,
          } as any);
        } else {
          // Create new teacher
          validatedData.push({
            ...validated,
            branchIds,
            fieldsInRow,
            rowNumber,
          } as any);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          result.errors.push(formatValidationErrors(error.errors, rowNumber));
        } else {
          result.errors.push({
            row: rowNumber,
            errors: [
              error instanceof Error
                ? error.message
                : "データ検証中にエラーが発生しました",
            ],
          });
        }
      }
    }

    // If there are critical errors, don't proceed with import
    if (result.errors.length > 0 && validatedData.length === 0) {
      return NextResponse.json(result, { status: 400 });
    }

    // Import valid data in batches (to avoid timeouts)
    if (validatedData.length > 0) {
      const batchSize = 100;
      for (let start = 0; start < validatedData.length; start += batchSize) {
        const batch = validatedData.slice(start, start + batchSize);
        await prisma.$transaction(async (tx) => {
          for (const data of batch) {
            if ((data as any).teacherId) {
              // Update strictly by ID
              const fieldsInRow = data.fieldsInRow || new Set();
              const userUpdates: any = {};
              if (fieldsInRow.has("email")) userUpdates.email = data.email ?? null;
              if (fieldsInRow.has("name")) userUpdates.name = data.name ?? null;
              if (fieldsInRow.has("password") && data.password && data.password.trim() !== "") {
                userUpdates.passwordHash = data.password;
              }

              const teacherUpdates: any = {};
              if (fieldsInRow.has("name")) teacherUpdates.name = data.name || null;
              if (fieldsInRow.has("kanaName")) teacherUpdates.kanaName = data.kanaName || null;
              if (fieldsInRow.has("notes")) teacherUpdates.notes = data.notes || null;
              if (fieldsInRow.has("birthDate")) teacherUpdates.birthDate = data.birthDate || null;
              if (fieldsInRow.has("lineId")) teacherUpdates.lineId = data.lineId || null;

              try {
                const updated = await tx.teacher.update({
                  where: { teacherId: (data as any).teacherId },
                  data: {
                    ...teacherUpdates,
                    ...(Object.keys(userUpdates).length > 0 ? { user: { update: userUpdates } } : {}),
                  },
                  select: { userId: true },
                });

                if (fieldsInRow.has("branches") && data.branchIds) {
                  await tx.userBranch.deleteMany({ where: { userId: updated.userId } });
                  if (data.branchIds.length > 0) {
                    for (const bId of data.branchIds) {
                      await tx.userBranch.create({ data: { userId: updated.userId, branchId: bId } });
                    }
                  } else {
                    await tx.userBranch.create({ data: { userId: updated.userId, branchId } });
                  }
                }
                result.updated!++;
              } catch (e) {
                result.errors.push({ row: data.rowNumber, errors: ["指定されたIDの講師が見つかりません"] });
                continue;
              }
            } else if ((data as any).existingUserId) {
              // Update by existing user (matched via username/email)
              const fieldsInRow = data.fieldsInRow || new Set();
              const userUpdates: any = {};
              if (fieldsInRow.has("email")) userUpdates.email = data.email ?? null;
              if (fieldsInRow.has("name")) userUpdates.name = data.name ?? null;
              if (fieldsInRow.has("password") && data.password && data.password.trim() !== "") {
                userUpdates.passwordHash = data.password;
              }

              try {
                // Update user
                if (Object.keys(userUpdates).length > 0) {
                  await tx.user.update({ where: { id: (data as any).existingUserId }, data: userUpdates });
                }

                // Update teacher (by userId)
                const teacherUpdates: any = {};
                const fields = data.fieldsInRow || new Set();
                if (fields.has("name")) teacherUpdates.name = data.name || null;
                if (fields.has("kanaName")) teacherUpdates.kanaName = data.kanaName || null;
                if (fields.has("notes")) teacherUpdates.notes = data.notes || null;
                if (fields.has("birthDate")) teacherUpdates.birthDate = data.birthDate || null;
                if (fields.has("lineId")) teacherUpdates.lineId = data.lineId || null;

                if (Object.keys(teacherUpdates).length > 0) {
                  await tx.teacher.update({ where: { userId: (data as any).existingUserId }, data: teacherUpdates });
                }

                // Update branches
                if (fields.has("branches") && data.branchIds) {
                  await tx.userBranch.deleteMany({ where: { userId: (data as any).existingUserId } });
                  if (data.branchIds.length > 0) {
                    for (const bId of data.branchIds) {
                      await tx.userBranch.create({ data: { userId: (data as any).existingUserId, branchId: bId } });
                    }
                  } else {
                    await tx.userBranch.create({ data: { userId: (data as any).existingUserId, branchId } });
                  }
                }

                result.updated!++;
              } catch (e) {
                result.errors.push({ row: data.rowNumber, errors: ["更新中にエラーが発生しました"] });
                continue;
              }
            } else {
              // Create new teacher
              try {
                let hashedPassword: string;
                if (data.password && data.password.trim() !== "") {
                  hashedPassword = data.password;
                } else {
                  const defaultPassword = `${data.username}@123`;
                  hashedPassword = defaultPassword;
                  result.warnings.push({
                    message: `行 ${data.rowNumber}: パスワードが指定されていないため、デフォルトパスワード（${defaultPassword}）を設定しました`,
                    type: "default_password",
                  });
                }

                // Pre-check user conflicts
                const conflict = await tx.user.findFirst({ where: { OR: [ { username: data.username }, ...(data.email ? [{ email: data.email }] : []) ] } });
                if (conflict) {
                  result.errors.push({ row: data.rowNumber, errors: [ conflict.username === data.username ? `ユーザー名「${data.username}」は既に使用されています` : `メールアドレス「${data.email}」は既に使用されています` ] });
                  continue;
                }

                const user = await tx.user.create({
                  data: {
                    username: data.username,
                    email: data.email || null,
                    passwordHash: hashedPassword,
                    name: data.name!,
                    role: "TEACHER",
                    isRestrictedAdmin: false,
                  },
                });

                await tx.teacher.create({
                  data: {
                    userId: user.id,
                    name: data.name!,
                    kanaName: data.kanaName || null,
                    email: data.email || null,
                    lineId: data.lineId || null,
                    notes: data.notes || null,
                    status: "ACTIVE",
                    birthDate: data.birthDate || null,
                    lineNotificationsEnabled: true,
                  },
                });

                if (data.branchIds && data.branchIds.length > 0) {
                  for (const bId of data.branchIds) {
                    await tx.userBranch.create({ data: { userId: user.id, branchId: bId } });
                  }
                } else {
                  await tx.userBranch.create({ data: { userId: user.id, branchId } });
                }

                result.created!++;
              } catch (e) {
                result.errors.push({ row: data.rowNumber, errors: ["新規作成中にエラーが発生しました（重複や無効な値の可能性）"] });
                continue;
              }
            }

            result.success++;
          }
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleImportError(error);
  }
}

export const POST = withBranchAccess(["ADMIN", "STAFF"], handleImport);
