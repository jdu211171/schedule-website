import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  studentImportSchema,
  studentUpdateImportSchema,
  type StudentImportData,
  type StudentUpdateImportData,
  type ImportResult,
  formatValidationErrors,
} from "@/schemas/import";
import { STUDENT_COLUMN_RULES, csvHeaderToDbField } from "@/schemas/import/student-column-rules";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { handleImportError } from "@/lib/import-error-handler";
// Helpers for parsing aggregated contact phones (連絡先電話)
type ParsedPhone = { type: "HOME" | "DAD" | "MOM" | "OTHER"; number: string; notes?: string | null };
function parseContactPhones(raw: string | undefined): ParsedPhone[] {
  const s = (raw || "").trim();
  if (!s) return [];
  const parts = s.split(/\s*;\s*/).filter(Boolean);
  const mapType = (label: string): ParsedPhone["type"] => {
    if (/自宅/.test(label)) return "HOME";
    if (/父/.test(label)) return "DAD";
    if (/母/.test(label)) return "MOM";
    return "OTHER";
  };
  const out: ParsedPhone[] = [];
  for (const p of parts) {
    const [label, ...rest] = p.split(":");
    const number = rest.join(":").trim();
    if (!number) continue;
    out.push({ type: mapType(label || ""), number });
  }
  return out;
}
// ImportMode not used in strict variant

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const returnErrorsCsv = url.searchParams.get("return") === "errors_csv";
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file");
    // Strict variant: row-level decision by presence of ID; no importMode

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 },
      );
    }

    // Convert file to buffer (kept for compatibility; streaming parser can be added later)
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

    // Process and validate each row
    const validatedData: ((StudentImportData | StudentUpdateImportData) & {
      studentTypeId?: string | null;
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

    // Pre-fetch all student types and subjects for validation
    const allStudentTypes = await prisma.studentType.findMany({
      select: { studentTypeId: true, name: true, maxYears: true },
    });
    const studentTypeMap = new Map(allStudentTypes.map((st) => [st.name, st]));

    const allSubjects = await prisma.subject.findMany({
      select: { subjectId: true, name: true },
    });
    const subjectMap = new Map(allSubjects.map((s) => [s.name, s.subjectId]));

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
        // Map CSV data to DB fields and filter ignored columns
        const filteredRow: Record<string, string> = {};
        const fieldsInRow: Set<string> = new Set();

        for (const [csvHeader, csvValue] of Object.entries(row)) {
          const dbField = headerMapping[csvHeader];
          if (!dbField) continue;

          const rule = Object.values(STUDENT_COLUMN_RULES).find(r => r.dbField === dbField);
          if (!rule) continue;

          // Skip columns marked ignore for both create and update
          if (rule.createRule === 'ignore' && rule.updateRule === 'ignore') continue;

          // Map to internal field name for schema validation
          filteredRow[dbField] = csvValue;
          fieldsInRow.add(dbField);
        }

        // Validate row data with filtered columns using appropriate schema
        const importStudentId = (((row as any).id || (row as any).ID) as string | undefined)?.trim();
        const isUpdateRow = !!importStudentId;
        const validated = isUpdateRow
          ? studentUpdateImportSchema.parse(filteredRow)
          : studentImportSchema.parse(filteredRow);

        // If no explicit ID, try to find an existing user by username/email for tolerant upsert
        // This aligns behavior with metadata_ja.md v2 and the teachers importer
        let existingUser: { id: string; username: string | null; student: { studentId: string } | null } | null = null;
        if (!isUpdateRow) {
          existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { username: validated.username },
                ...(validated.email ? [{ email: validated.email }] : []),
              ],
            },
            select: { id: true, username: true, student: { select: { studentId: true } } },
          });
        }

        // Validate student type (only if provided)
        let studentType = null;
        if (validated.studentTypeName) {
          studentType = studentTypeMap.get(validated.studentTypeName);
          if (!studentType) {
            result.errors.push({
              row: rowNumber,
              errors: [
                `学生タイプ「${validated.studentTypeName}」が見つかりません`,
              ],
            });
            continue;
          }

          // Validate grade year against student type max years
          if (
            studentType.maxYears !== null &&
            validated.gradeYear &&
            validated.gradeYear > studentType.maxYears
          ) {
            result.errors.push({
              row: rowNumber,
              errors: [
                `学年${validated.gradeYear}は学生タイプ「${validated.studentTypeName}」の最大学年${studentType.maxYears}を超えています`,
              ],
            });
            continue;
          }
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
          // Default to current branch when creating and branches not provided
          if (branchId) branchIds = [branchId];
        }

        // Decide create vs update
        if (isUpdateRow) {
          // Strict update by provided ID
          validatedData.push({
            ...validated,
            studentTypeId: studentType?.studentTypeId || null,
            branchIds,
            fieldsInRow,
            rowNumber,
            studentId: importStudentId,
          } as any);
        } else if (existingUser) {
          // Fallback: update by username/email when ID is missing
          // If student already exists for this user, we will update; otherwise we will create the student for the user
          validatedData.push({
            ...validated,
            studentTypeId: studentType?.studentTypeId || null,
            branchIds,
            fieldsInRow,
            rowNumber,
            existingUserId: existingUser.id,
          } as any);
        } else {
          // Create new user + student
          validatedData.push({
            ...validated,
            studentTypeId: studentType?.studentTypeId || null,
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

    // If dry-run requested, skip DB writes and return validation report
    if (dryRun) {
      // Attach errorCsv when requested
      if (returnErrorsCsv && result.errors.length > 0) {
        try {
          const headers = [...actualHeaders, "エラー"];
          const lines: string[] = [];
          const errorRows = new Map<number, string>(
            result.errors.map(e => [e.row, e.errors.join("; ")])
          );
          const errorFilename = `student_import_errors_${new Date().toISOString().slice(0,10)}.csv`;
          for (let i = 0; i < parseResult.data.length; i++) {
            const row = parseResult.data[i] as Record<string, any>;
            const rowNumber = i + 2;
            const err = errorRows.get(rowNumber);
            if (!err) continue; // only failed rows
            const values = headers.map(h => {
              if (h === "エラー") return err;
              const v = row[h] ?? "";
              const s = String(v ?? "");
              return s.includes(",") || s.includes("\n") || s.includes('"')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            });
            lines.push(values.join(","));
          }
          const headerLine = headers.join(",");
          const bom = "\uFEFF";
          (result as any).errorCsv = `data:text/csv;charset=utf-8,${encodeURIComponent(bom + headerLine + "\n" + lines.join("\n"))}`;
          (result as any).errorCsvFilename = errorFilename;
          (result as any).errorCount = result.errors.length;
        } catch {
          // Ignore attachment failure; still return errors JSON
        }
      }

      return NextResponse.json(result, { status: result.errors.length > 0 ? 207 : 200 });
    }

    // Import valid data in batches to avoid long transactions/timeouts
    if (validatedData.length > 0) {
      const batchSize = Number.parseInt(process.env.IMPORT_BATCH_SIZE || "500", 10);
      for (let start = 0; start < validatedData.length; start += batchSize) {
        const batch = validatedData.slice(start, start + batchSize);
        await prisma.$transaction(async (tx) => {
          for (const data of batch) {
            if ((data as any).studentId) {
              // Strict update by ID; only update fields present in the row
              const fieldsInRow = data.fieldsInRow || new Set();
              const userUpdates: any = {};
              if (fieldsInRow.has("email")) userUpdates.email = data.email ?? null;
              if (fieldsInRow.has("name")) userUpdates.name = data.name ?? null;
              if (fieldsInRow.has("password") && data.password && data.password.trim() !== "") {
                // Store password as provided (no hashing per spec)
                userUpdates.passwordHash = data.password;
              }

              const studentUpdates: any = {};
              if (fieldsInRow.has("name")) studentUpdates.name = data.name || null;
              if (fieldsInRow.has("kanaName")) studentUpdates.kanaName = data.kanaName || null;
              if (fieldsInRow.has("studentTypeName")) {
                if (data.studentTypeId) {
                  (studentUpdates as any).studentType = { connect: { studentTypeId: data.studentTypeId } };
                } else {
                  (studentUpdates as any).studentType = { disconnect: true };
                }
              }
              if (fieldsInRow.has("gradeYear")) studentUpdates.gradeYear = data.gradeYear;
              if (fieldsInRow.has("notes")) studentUpdates.notes = data.notes || null;
              if (fieldsInRow.has("schoolName")) studentUpdates.schoolName = data.schoolName || null;
              if (fieldsInRow.has("schoolType")) studentUpdates.schoolType = data.schoolType || null;
              if (fieldsInRow.has("examCategory")) studentUpdates.examCategory = data.examCategory || null;
              if (fieldsInRow.has("examCategoryType")) studentUpdates.examCategoryType = data.examCategoryType || null;
              if (fieldsInRow.has("firstChoice")) studentUpdates.firstChoice = data.firstChoice || null;
              if (fieldsInRow.has("secondChoice")) studentUpdates.secondChoice = data.secondChoice || null;
              if (fieldsInRow.has("examDate")) studentUpdates.examDate = data.examDate || null;
              if (fieldsInRow.has("parentEmail")) studentUpdates.parentEmail = data.parentEmail || null;
              if (fieldsInRow.has("birthDate")) studentUpdates.birthDate = data.birthDate || null;
              if (fieldsInRow.has("lineId")) studentUpdates.lineId = data.lineId || null;

              try {
                // Pre-check existence to provide accurate error messages
                const existing = await tx.student.findUnique({
                  where: { studentId: (data as any).studentId },
                  select: { userId: true },
                });
                if (!existing) {
                  result.errors.push({ row: data.rowNumber, errors: ["指定されたIDの生徒が見つかりません"] });
                  continue;
                }

                const updated = await tx.student.update({
                  where: { studentId: (data as any).studentId },
                  data: {
                    ...studentUpdates,
                    ...(Object.keys(userUpdates).length > 0 ? { user: { update: userUpdates } } : {}),
                  },
                  select: { userId: true },
                });

                if (fieldsInRow.has("contactPhones")) {
                  const phones = parseContactPhones((data as any).contactPhones as string);
                  await tx.contactPhone.deleteMany({ where: { studentId: (data as any).studentId } });
                  let home: string | null = null;
                  let parent: string | null = null;
                  let studentSelf: string | null = null;
                  for (let i = 0; i < phones.length; i++) {
                    const p = phones[i];
                    await tx.contactPhone.create({
                      data: {
                        studentId: (data as any).studentId,
                        phoneType: p.type as any,
                        phoneNumber: p.number,
                        notes: p.notes ?? null,
                        order: i,
                      },
                    });
                    if (p.type === "HOME" && !home) home = p.number;
                    if ((p.type === "DAD" || p.type === "MOM") && !parent) parent = p.number;
                    if (p.type === "OTHER" && !studentSelf) studentSelf = p.number;
                  }
                  await tx.student.update({
                    where: { studentId: (data as any).studentId },
                    data: { homePhone: home, parentPhone: parent, studentPhone: studentSelf },
                  });
                }

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
              } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError) {
                  if (e.code === "P2025") {
                    result.errors.push({ row: data.rowNumber, errors: ["指定されたIDの生徒が見つかりません"] });
                  } else if (e.code === "P2002") {
                    result.errors.push({ row: data.rowNumber, errors: ["一意制約違反（メールアドレス/ユーザー名などが重複しています）"] });
                  } else if (e.code === "P2003") {
                    result.errors.push({ row: data.rowNumber, errors: ["参照整合性エラー（関連データが存在しません）"] });
                  } else {
                    result.errors.push({ row: data.rowNumber, errors: [
                      `更新中にエラーが発生しました（${e.code}）`
                    ] });
                  }
                } else if (e instanceof Error) {
                  result.errors.push({ row: data.rowNumber, errors: [
                    `更新中にエラーが発生しました: ${e.message}`
                  ] });
                } else {
                  result.errors.push({ row: data.rowNumber, errors: ["更新中に不明なエラーが発生しました"] });
                }
                continue;
              }
            } else if ((data as any).existingUserId) {
              // Upsert by existing user (matched via username/email when ID missing)
              const fieldsInRow = data.fieldsInRow || new Set();
              const userId = (data as any).existingUserId as string;
              const userUpdates: any = {};
              if (fieldsInRow.has("email")) userUpdates.email = data.email ?? null;
              if (fieldsInRow.has("name")) userUpdates.name = data.name ?? null;
              if (fieldsInRow.has("password") && data.password && data.password.trim() !== "") {
                userUpdates.passwordHash = data.password;
              }

              try {
                // Update user if needed
                if (Object.keys(userUpdates).length > 0) {
                  await tx.user.update({ where: { id: userId }, data: userUpdates });
                }

                // Check if student exists for this user
                const existingStudent = await tx.student.findFirst({ where: { userId }, select: { studentId: true } });

                if (existingStudent) {
                  // Update student
                  const studentUpdates: any = {};
                  if (fieldsInRow.has("name")) studentUpdates.name = data.name || null;
                  if (fieldsInRow.has("kanaName")) studentUpdates.kanaName = data.kanaName || null;
                  if (fieldsInRow.has("studentTypeName")) {
                    if (data.studentTypeId) {
                      (studentUpdates as any).studentType = { connect: { studentTypeId: data.studentTypeId } };
                    } else {
                      (studentUpdates as any).studentType = { disconnect: true };
                    }
                  }
                  if (fieldsInRow.has("gradeYear")) studentUpdates.gradeYear = data.gradeYear;
                  if (fieldsInRow.has("notes")) studentUpdates.notes = data.notes || null;
                  if (fieldsInRow.has("schoolName")) studentUpdates.schoolName = data.schoolName || null;
                  if (fieldsInRow.has("schoolType")) studentUpdates.schoolType = data.schoolType || null;
                  if (fieldsInRow.has("examCategory")) studentUpdates.examCategory = data.examCategory || null;
                  if (fieldsInRow.has("examCategoryType")) studentUpdates.examCategoryType = data.examCategoryType || null;
                  if (fieldsInRow.has("firstChoice")) studentUpdates.firstChoice = data.firstChoice || null;
                  if (fieldsInRow.has("secondChoice")) studentUpdates.secondChoice = data.secondChoice || null;
                  if (fieldsInRow.has("examDate")) studentUpdates.examDate = data.examDate || null;
                  if (fieldsInRow.has("parentEmail")) studentUpdates.parentEmail = data.parentEmail || null;
                  if (fieldsInRow.has("birthDate")) studentUpdates.birthDate = data.birthDate || null;
                  if (fieldsInRow.has("lineId")) studentUpdates.lineId = data.lineId || null;

                  await tx.student.update({ where: { studentId: existingStudent.studentId }, data: studentUpdates });
                  if (fieldsInRow.has("contactPhones")) {
                    const phones = parseContactPhones((data as any).contactPhones as string);
                    await tx.contactPhone.deleteMany({ where: { studentId: existingStudent.studentId } });
                    let home: string | null = null;
                    let parent: string | null = null;
                    let studentSelf: string | null = null;
                    for (let i = 0; i < phones.length; i++) {
                      const p = phones[i];
                      await tx.contactPhone.create({
                        data: {
                          studentId: existingStudent.studentId,
                          phoneType: p.type as any,
                          phoneNumber: p.number,
                          notes: p.notes ?? null,
                          order: i,
                        },
                      });
                      if (p.type === "HOME" && !home) home = p.number;
                      if ((p.type === "DAD" || p.type === "MOM") && !parent) parent = p.number;
                      if (p.type === "OTHER" && !studentSelf) studentSelf = p.number;
                    }
                    await tx.student.update({
                      where: { studentId: existingStudent.studentId },
                      data: { homePhone: home, parentPhone: parent, studentPhone: studentSelf },
                    });
                  }
                  result.updated!++;
                } else {
                  // Create student for this existing user
                  const studentCreateData: any = {
                    userId,
                    name: data.name!,
                    kanaName: data.kanaName || null,
                    gradeYear: data.gradeYear || null,
                    lineId: data.lineId || null,
                    notes: data.notes || null,
                    status: "ACTIVE",
                    schoolName: data.schoolName || null,
                    schoolType: data.schoolType || null,
                    examCategory: data.examCategory || null,
                    examCategoryType: data.examCategoryType || null,
                    firstChoice: data.firstChoice || null,
                    secondChoice: data.secondChoice || null,
                    examDate: data.examDate || null,
                    parentEmail: data.parentEmail || null,
                    birthDate: data.birthDate || null,
                  };
                  if (data.studentTypeId) {
                    studentCreateData.studentTypeId = data.studentTypeId;
                  }

                  await tx.student.create({ data: studentCreateData });

                  if (fieldsInRow.has("contactPhones")) {
                    const phones = parseContactPhones((data as any).contactPhones as string);
                    const created = await tx.student.findFirst({ where: { userId }, select: { studentId: true } });
                    if (created?.studentId) {
                      let home: string | null = null;
                      let parent: string | null = null;
                      let studentSelf: string | null = null;
                      for (let i = 0; i < phones.length; i++) {
                        const p = phones[i];
                        await tx.contactPhone.create({
                          data: {
                            studentId: created.studentId,
                            phoneType: p.type as any,
                            phoneNumber: p.number,
                            notes: p.notes ?? null,
                            order: i,
                          },
                        });
                        if (p.type === "HOME" && !home) home = p.number;
                        if ((p.type === "DAD" || p.type === "MOM") && !parent) parent = p.number;
                        if (p.type === "OTHER" && !studentSelf) studentSelf = p.number;
                      }
                      await tx.student.update({
                        where: { studentId: created.studentId },
                        data: { homePhone: home, parentPhone: parent, studentPhone: studentSelf },
                      });
                    }
                  }
                  result.created!++;
                }

                // Update branches if provided
                if (fieldsInRow.has("branches") && data.branchIds) {
                  await tx.userBranch.deleteMany({ where: { userId } });
                  if (data.branchIds.length > 0) {
                    for (const bId of data.branchIds) {
                      await tx.userBranch.create({ data: { userId, branchId: bId } });
                    }
                  } else {
                    await tx.userBranch.create({ data: { userId, branchId } });
                  }
                }
              } catch (e: any) {
                if (e instanceof Prisma.PrismaClientKnownRequestError) {
                  if (e.code === "P2002") {
                    result.errors.push({ row: data.rowNumber, errors: ["一意制約違反（メールアドレス/ユーザー名などが重複しています）"] });
                  } else if (e.code === "P2003") {
                    result.errors.push({ row: data.rowNumber, errors: ["参照整合性エラー（関連データが存在しません）"] });
                  } else {
                    result.errors.push({ row: data.rowNumber, errors: [`更新/作成中にエラーが発生しました（${e.code}）`] });
                  }
                } else if (e instanceof Error) {
                  result.errors.push({ row: data.rowNumber, errors: [`更新/作成中にエラーが発生しました: ${e.message}`] });
                } else {
                  result.errors.push({ row: data.rowNumber, errors: ["更新/作成中に不明なエラーが発生しました"] });
                }
                continue;
              }
            } else {
              // Create new student
              // For create mode, password is optional - generate a default if not provided
              let plainPassword: string;
              if (data.password && data.password.trim() !== "") {
                // Use the password directly (no hashing per spec)
                plainPassword = data.password;
              } else {
                // Generate a default password if not provided
                const defaultPassword = `${data.username}@123`;
                plainPassword = defaultPassword;
                result.warnings.push({
                  message: `行 ${data.rowNumber}: パスワードが指定されていないため、デフォルトパスワード（${defaultPassword}）を設定しました`,
                  type: "default_password",
                });
              }

              // Create user + student in try/catch to keep batch going on constraint errors
              try {
              // Pre-check user conflicts to avoid partial creations
              const conflict = await tx.user.findFirst({
                where: { OR: [ { username: data.username }, ...(data.email ? [{ email: data.email }] : []) ] },
                select: { username: true, email: true },
              });
              if (conflict) {
                result.errors.push({ row: data.rowNumber, errors: [ conflict.username === data.username ? `ユーザー名「${data.username}」は既に使用されています` : `メールアドレス「${data.email}」は既に使用されています` ] });
                continue;
              }
                // Create user
                const user = await tx.user.create({
                  data: {
                    username: data.username,
                    email: data.email || null,
                    passwordHash: plainPassword,
                    name: data.name!,
                    role: "STUDENT",
                    isRestrictedAdmin: false,
                  },
                });

              // Create student with all fields
              const studentCreateData: any = {
                userId: user.id,
                name: data.name!,
                kanaName: data.kanaName || null,
                gradeYear: data.gradeYear || null,
                lineId: data.lineId || null,
                notes: data.notes || null,
                status: "ACTIVE",
                // School information
                schoolName: data.schoolName || null,
                schoolType: data.schoolType || null,
                // Exam information
                examCategory: data.examCategory || null,
                examCategoryType: data.examCategoryType || null,
                firstChoice: data.firstChoice || null,
                secondChoice: data.secondChoice || null,
                examDate: data.examDate || null,
                // Contact information
                parentEmail: data.parentEmail || null,
                // Personal information
                birthDate: data.birthDate || null,
              };

              if (data.studentTypeId) {
                studentCreateData.studentTypeId = data.studentTypeId;
              }

              await tx.student.create({ data: studentCreateData });

              // Assign student to branches
              if (data.branchIds && data.branchIds.length > 0) {
                // Use branches from CSV
                for (const branchId of data.branchIds) {
                  await tx.userBranch.create({
                    data: {
                      userId: user.id,
                      branchId: branchId,
                    },
                  });
                }
              } else {
                // Default to current branch if no branches specified
                await tx.userBranch.create({
                  data: {
                    userId: user.id,
                    branchId: branchId,
                  },
                });
              }

              result.created!++;
            } catch (e: any) {
              if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === "P2002") {
                  result.errors.push({ row: data.rowNumber, errors: ["一意制約違反（メールアドレス/ユーザー名などが重複しています）"] });
                } else if (e.code === "P2003") {
                  result.errors.push({ row: data.rowNumber, errors: ["参照整合性エラー（関連データが存在しません）"] });
                } else {
                  result.errors.push({ row: data.rowNumber, errors: [`新規作成中にエラーが発生しました（${e.code}）`] });
                }
              } else if (e instanceof Error) {
                result.errors.push({ row: data.rowNumber, errors: [`新規作成中にエラーが発生しました: ${e.message}`] });
              } else {
                result.errors.push({ row: data.rowNumber, errors: ["新規作成中に不明なエラーが発生しました"] });
              }
              continue;
            }
          }

          result.success++;
        }
        });
      }
    }

    // Attach errorCsv when requested
    if (returnErrorsCsv && result.errors.length > 0) {
      try {
        const headers = [...actualHeaders, "エラー"];
        const lines: string[] = [];
        const errorRows = new Map<number, string>(
          result.errors.map(e => [e.row, e.errors.join("; ")])
        );
        const errorFilename = `student_import_errors_${new Date().toISOString().slice(0,10)}.csv`;
        for (let i = 0; i < parseResult.data.length; i++) {
          const row = parseResult.data[i] as Record<string, any>;
          const rowNumber = i + 2;
          const err = errorRows.get(rowNumber);
          if (!err) continue; // only failed rows
          const values = headers.map(h => {
            if (h === "エラー") return err;
            const v = row[h] ?? "";
            const s = String(v ?? "");
            return s.includes(",") || s.includes("\n") || s.includes('"')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          });
          lines.push(values.join(","));
        }
        const headerLine = headers.join(",");
        const bom = "\uFEFF";
        (result as any).errorCsv = `data:text/csv;charset=utf-8,${encodeURIComponent(bom + headerLine + "\n" + lines.join("\n"))}`;
        (result as any).errorCsvFilename = errorFilename;
        (result as any).errorCount = result.errors.length;
      } catch {
        // ignore
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleImportError(error);
  }
}

export const POST = withBranchAccess(["ADMIN", "STAFF"], handleImport);
