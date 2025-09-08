import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  teacherImportSchema,
  teacherUpdateImportSchema,
  type ImportResult,
} from "@/schemas/import";
import {
  TEACHER_COLUMN_RULES,
  teacherCsvHeaderToDbField,
} from "@/schemas/import/teacher-column-rules";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { handleImportError } from "@/lib/import-error-handler";

// Parse subject preferences from "科目 - 種別; ..." into pairs of names
type ParsedSubjectPair = { subjectName: string; subjectTypeName: string };
function parseSubjectsRaw(raw: string | undefined): ParsedSubjectPair[] {
  const s = (raw || "").trim();
  if (!s) return [];
  return s
    .split(/\s*;\s*/)
    .filter(Boolean)
    .map((entry) => {
      const [left, right] = entry.split(/\s*-\s*/);
      return { subjectName: (left || "").trim(), subjectTypeName: (right || "").trim() };
    })
    .filter((p) => p.subjectName.length > 0 && p.subjectTypeName.length > 0);
}

// Status parser: 在籍/休会/退会 or ACTIVE/SICK/PERMANENTLY_LEFT
function parseStatus(raw: string | undefined | null): "ACTIVE" | "SICK" | "PERMANENTLY_LEFT" | null | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === "") return null;
  const upper = s.toUpperCase();
  if (upper === "ACTIVE" || s === "在籍") return "ACTIVE";
  if (upper === "SICK" || s === "休会") return "SICK";
  if (upper === "PERMANENTLY_LEFT" || s === "退会") return "PERMANENTLY_LEFT";
  return null;
}

// Parse contact emails: "email[:notes]; email2[:notes2]"
type ParsedEmail = { email: string; notes?: string | null };
function parseContactEmails(raw: string | undefined): ParsedEmail[] {
  const s = (raw || "").trim();
  if (!s) return [];
  const items = s.split(/\s*;\s*/).filter(Boolean);
  const out: ParsedEmail[] = [];
  for (const it of items) {
    const [email, ...noteParts] = it.split(":");
    const e = (email || "").trim();
    if (!e) continue;
    const notes = noteParts.join(":").trim();
    out.push({ email: e, notes: notes ? notes : null });
  }
  return out;
}

// Parse contact phones: supports either "ラベル:番号" or "番号[:備考]". Label is stored as notes.
type ParsedPhone = { number: string; notes?: string | null };
function parseContactPhones(raw: string | undefined): ParsedPhone[] {
  const s = (raw || "").trim();
  if (!s) return [];
  const parts = s.split(/\s*;\s*/).filter(Boolean);
  const out: ParsedPhone[] = [];
  for (const p of parts) {
    const segs = p.split(":");
    if (segs.length === 1) {
      const num = segs[0].trim();
      if (!num) continue;
      out.push({ number: num });
      continue;
    }
    const first = segs[0].trim();
    const rest = segs.slice(1).join(":").trim();
    if (!rest) continue;
    // If first segment looks like a number (contains digit), treat as number:notes
    if (/[0-9０-９]/.test(first)) {
      out.push({ number: first, notes: rest || null });
    } else {
      // Treat as label:number => store label in notes
      out.push({ number: rest, notes: first || null });
    }
  }
  return out;
}

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const returnErrorsCsv = url.searchParams.get("return") === "errors_csv";

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const buffer = Buffer.from(await (file as Blob).arrayBuffer());
    const parseResult = await CSVParser.parseBuffer<Record<string, string>>(buffer, { encoding: "utf-8" });

    if (parseResult.errors.length > 0) {
      return NextResponse.json({ error: "CSVファイルの解析に失敗しました", details: parseResult.errors }, { status: 400 });
    }

    if (parseResult.data.length === 0) {
      return NextResponse.json({ error: "CSVファイルが空です" }, { status: 400 });
    }

    const actualHeaders = Object.keys(parseResult.data[0]);

    // Validate headers (warn on unknown)
    const knownHeaders = new Set<string>(["ID", ...Object.values(TEACHER_COLUMN_RULES).map(r => r.csvHeader)]);
    const unknownHeaders = actualHeaders.filter(h => !knownHeaders.has(h));
    const result: ImportResult = { success: 0, errors: [], warnings: [], created: 0, updated: 0, deleted: 0, skipped: 0 };
    if (unknownHeaders.length > 0) {
      result.warnings.push({ message: `未対応の列が含まれています: ${unknownHeaders.join(", ")}` });
      // eslint-disable-next-line no-console
      console.warn("Unknown CSV headers (teachers):", unknownHeaders);
    }
    if (!actualHeaders.includes("ID") && !actualHeaders.includes("ユーザー名")) {
      return NextResponse.json({ error: "CSVにIDまたはユーザー名の列が必要です" }, { status: 400 });
    }

    // Pre-fetch subjects, subject types, branches
    const allSubjects = await prisma.subject.findMany({ select: { subjectId: true, name: true } });
    const subjectMap = new Map(allSubjects.map(s => [s.name, s.subjectId]));
    const allSubjectTypes = await prisma.subjectType.findMany({ select: { subjectTypeId: true, name: true } });
    const subjectTypeMap = new Map(allSubjectTypes.map(t => [t.name, t.subjectTypeId]));
    const allBranches = await prisma.branch.findMany({ select: { branchId: true, name: true } });
    const branchMap = new Map(allBranches.map(b => [b.name, b.branchId]));

    // Map CSV headers to DB fields
    const headerMapping: Record<string, string> = {};
    for (const header of actualHeaders) {
      const db = teacherCsvHeaderToDbField(header);
      if (db) headerMapping[header] = db;
    }

    // Process rows
    type RowData = (z.infer<typeof teacherImportSchema> | z.infer<typeof teacherUpdateImportSchema>) & {
      branchIds?: string[];
      subjectPrefTuples?: Array<{ subjectId: string; subjectTypeId: string }>;
      existingUserId?: string;
      status?: "ACTIVE" | "SICK" | "PERMANENTLY_LEFT" | null;
      fieldsInRow?: Set<string>;
      rowNumber: number;
      teacherId?: string;
    };

    const validatedData: RowData[] = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2;
      try {
        // Map CSV -> DB fields and record which fields appear
        const filteredRow: Record<string, string> = {};
        const fieldsInRow: Set<string> = new Set();
        for (const [csvHeader, csvValue] of Object.entries(row)) {
          const dbField = headerMapping[csvHeader];
          if (!dbField) continue;
          const rule = Object.values(TEACHER_COLUMN_RULES).find(r => r.dbField === dbField);
          if (rule && rule.createRule === 'ignore' && rule.updateRule === 'ignore') continue;
          filteredRow[dbField] = csvValue ?? "";
          fieldsInRow.add(dbField);
        }

        const importTeacherId = (((row as any).id || (row as any).ID) as string | undefined)?.trim();
        const isUpdateRow = !!importTeacherId;

        const validated = isUpdateRow
          ? teacherUpdateImportSchema.parse(filteredRow)
          : teacherImportSchema.parse(filteredRow);

        // Status mapping (warning on unknown)
        let parsedStatus: RowData['status'];
        if (fieldsInRow.has('status')) {
          const original = filteredRow['status'];
          parsedStatus = parseStatus(original);
          if (original && original.trim() !== '' && parsedStatus === null) {
            result.warnings.push({ row: rowNumber, message: `不明なステータス値を無視しました: ${original}` });
          }
        }

        // Branch validation (names -> ids)
        let branchIds: string[] | undefined;
        if ((validated as any).branches && Array.isArray((validated as any).branches) && (validated as any).branches.length > 0) {
          const names = (validated as any).branches as string[];
          const invalid = names.filter(n => !branchMap.has(n));
          if (invalid.length > 0) {
            result.errors.push({ row: rowNumber, errors: [`校舎が見つかりません: ${invalid.join(", ")}`] });
            continue;
          }
          branchIds = names.map(n => branchMap.get(n)!);
        }

        // Parse subjects
        let subjectPrefTuples: Array<{ subjectId: string; subjectTypeId: string }> | undefined;
        if (fieldsInRow.has('subjects')) {
          const pairs = parseSubjectsRaw((filteredRow as any)['subjects']);
          const invalids: string[] = [];
          const tuples: Array<{ subjectId: string; subjectTypeId: string }> = [];
          for (const p of pairs) {
            const sid = subjectMap.get(p.subjectName);
            const stid = subjectTypeMap.get(p.subjectTypeName);
            if (!sid || !stid) invalids.push(`${p.subjectName} - ${p.subjectTypeName}`);
            else tuples.push({ subjectId: sid, subjectTypeId: stid });
          }
          if (invalids.length > 0) {
            result.errors.push({ row: rowNumber, errors: [`選択科目が不正です: ${invalids.join(", ")}`] });
            continue;
          }
          subjectPrefTuples = tuples; // empty array means clear
        }

        // Try tolerant upsert: by ID strict update, otherwise find by username/email
        let existingUser: { id: string; teacher: { teacherId: string } | null } | null = null;
        if (!isUpdateRow) {
          existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { username: (validated as any).username },
                ...(((validated as any).email) ? [{ email: (validated as any).email }] : []),
              ],
            },
            select: { id: true, teacher: { select: { teacherId: true } } },
          });
        }

        if (isUpdateRow) {
          validatedData.push({
            ...(validated as any),
            teacherId: importTeacherId,
            branchIds,
            subjectPrefTuples,
            status: parsedStatus,
            fieldsInRow,
            rowNumber,
          });
        } else if (existingUser) {
          validatedData.push({
            ...(validated as any),
            existingUserId: existingUser.id,
            branchIds,
            subjectPrefTuples,
            status: parsedStatus,
            fieldsInRow,
            rowNumber,
          });
        } else {
          validatedData.push({
            ...(validated as any),
            branchIds,
            subjectPrefTuples,
            status: parsedStatus,
            fieldsInRow,
            rowNumber,
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          result.errors.push({ row: rowNumber, errors: error.errors.map(e => e.message) });
        } else if (error instanceof Error) {
          result.errors.push({ row: rowNumber, errors: [error.message] });
        } else {
          result.errors.push({ row: rowNumber, errors: ["不明なエラーが発生しました"] });
        }
        continue;
      }
    }

    if (!dryRun && validatedData.length > 0) {
      const batchSize = Number.parseInt(process.env.IMPORT_BATCH_SIZE || "500", 10);
      for (let i = 0; i < validatedData.length; i += batchSize) {
        const batch = validatedData.slice(i, i + batchSize);
        await prisma.$transaction(async (tx) => {
          for (const data of batch) {
            const fieldsInRow = data.fieldsInRow ?? new Set<string>();
            try {
              if (data.teacherId) {
                // Strict update by teacherId
                const t = await tx.teacher.findUnique({ where: { teacherId: data.teacherId }, select: { userId: true } });
                if (!t) {
                  result.errors.push({ row: data.rowNumber, errors: ["指定されたIDの講師が見つかりません"] });
                  continue;
                }
                const userId = t.userId;

                // Update user if fields provided
                const userUpdate: any = {};
                if ((data as any).username != null) userUpdate.username = (data as any).username;
                if ((data as any).email !== undefined) userUpdate.email = (data as any).email || null;
                if ((data as any).password) userUpdate.passwordHash = (data as any).password;
                if (Object.keys(userUpdate).length > 0) {
                  await tx.user.update({ where: { id: userId }, data: userUpdate });
                }

                // Update teacher fields
                const teacherUpdate: any = {};
                if ((data as any).name != null) teacherUpdate.name = (data as any).name;
                if (fieldsInRow.has("kanaName")) teacherUpdate.kanaName = (data as any).kanaName ?? null;
                if (fieldsInRow.has("birthDate")) teacherUpdate.birthDate = (data as any).birthDate ?? null;
                if (fieldsInRow.has("notes")) teacherUpdate.notes = (data as any).notes ?? null;
                if (fieldsInRow.has("phoneNumber")) teacherUpdate.phoneNumber = (data as any).phoneNumber ?? null;
                if (fieldsInRow.has("phoneNotes")) teacherUpdate.phoneNotes = (data as any).phoneNotes ?? null;
                if (fieldsInRow.has("status") && data.status !== undefined) teacherUpdate.status = data.status ?? undefined;
                if (Object.keys(teacherUpdate).length > 0) {
                  await tx.teacher.update({ where: { teacherId: data.teacherId }, data: teacherUpdate });
                }

                // Update branches if provided
                if (fieldsInRow.has("branches") && data.branchIds) {
                  await tx.userBranch.deleteMany({ where: { userId } });
                  if (data.branchIds.length > 0) {
                    for (const bId of data.branchIds) {
                      await tx.userBranch.create({ data: { userId, branchId: bId } });
                    }
                  } else if (branchId) {
                    await tx.userBranch.create({ data: { userId, branchId } });
                  }
                }

                // Replace subject preferences when provided
                if (fieldsInRow.has("subjects")) {
                  await tx.userSubjectPreference.deleteMany({ where: { userId } });
                  const tuples = data.subjectPrefTuples || [];
                  for (const t of tuples) {
                    await tx.userSubjectPreference.create({ data: { userId, subjectId: t.subjectId, subjectTypeId: t.subjectTypeId } });
                  }
                }

                // Replace contact phones if provided
                if (fieldsInRow.has("contactPhones")) {
                  const phones = parseContactPhones((data as any).contactPhones as string);
                  await tx.teacherContactPhone.deleteMany({ where: { teacherId: data.teacherId } });
                  for (let i = 0; i < phones.length; i++) {
                    const p = phones[i];
                    await tx.teacherContactPhone.create({
                      data: {
                        teacherId: data.teacherId,
                        phoneNumber: p.number,
                        notes: p.notes ?? null,
                        order: i,
                      },
                    });
                  }
                }

                // Replace contact emails if provided
                if (fieldsInRow.has("contactEmails")) {
                  const emails = parseContactEmails((data as any).contactEmails as string);
                  await tx.teacherContactEmail.deleteMany({ where: { teacherId: data.teacherId } });
                  for (let i = 0; i < emails.length; i++) {
                    const e = emails[i];
                    await tx.teacherContactEmail.create({ data: { teacherId: data.teacherId, email: e.email, notes: e.notes ?? null, order: i } });
                  }
                }

                result.updated!++;
              } else {
                // Create or update by existing user
                let userId: string | null = data.existingUserId || null;

                if (!userId) {
                  // Create user
                  let plainPassword: string;
                  if ((data as any).password && (data as any).password.trim() !== "") {
                    plainPassword = (data as any).password;
                  } else {
                    const defaultPassword = `${(data as any).username}@123`;
                    plainPassword = defaultPassword;
                    result.warnings.push({ row: data.rowNumber, message: `パスワードが指定されていないため、デフォルトパスワード（${defaultPassword}）を設定しました`, type: "default_password" });
                  }

                  // Conflict pre-check
                  const conflict = await tx.user.findFirst({
                    where: { OR: [ { username: (data as any).username }, ...(((data as any).email ? [{ email: (data as any).email }] : [])) ] },
                    select: { username: true, email: true },
                  });
                  if (conflict) {
                    result.errors.push({ row: data.rowNumber, errors: [ conflict.username === (data as any).username ? `ユーザー名「${(data as any).username}」は既に使用されています` : `メールアドレス「${(data as any).email}」は既に使用されています` ] });
                    continue;
                  }

                  const user = await tx.user.create({ data: { username: (data as any).username, email: (data as any).email || null, passwordHash: plainPassword, name: (data as any).name!, role: "TEACHER", isRestrictedAdmin: false } });
                  userId = user.id;

                  // Branches
                  if (data.branchIds && data.branchIds.length > 0) {
                    for (const bId of data.branchIds) {
                      await tx.userBranch.create({ data: { userId, branchId: bId } });
                    }
                  } else if (branchId) {
                    await tx.userBranch.create({ data: { userId, branchId } });
                  }

                  // Subject preferences
                  if (fieldsInRow.has("subjects")) {
                    const tuples = data.subjectPrefTuples || [];
                    for (const t of tuples) {
                      await tx.userSubjectPreference.create({ data: { userId, subjectId: t.subjectId, subjectTypeId: t.subjectTypeId } });
                    }
                  }

                  // Create teacher
                  const createdTeacher = await tx.teacher.create({ data: {
                    userId,
                    name: (data as any).name!,
                    kanaName: (data as any).kanaName || null,
                    email: (data as any).email || null,
                    notes: (data as any).notes || null,
                    status: (data as any).status ?? 'ACTIVE',
                    birthDate: (data as any).birthDate || null,
                    phoneNumber: (data as any).phoneNumber || null,
                    phoneNotes: (data as any).phoneNotes || null,
                  } , select: { teacherId: true } });

                  // Contact phones
                  if (fieldsInRow.has("contactPhones")) {
                    const phones = parseContactPhones((data as any).contactPhones as string);
                    for (let i = 0; i < phones.length; i++) {
                      const p = phones[i];
                      await tx.teacherContactPhone.create({ data: { teacherId: createdTeacher.teacherId, phoneNumber: p.number, notes: p.notes ?? null, order: i } });
                    }
                  }

                  // Contact emails
                  if (fieldsInRow.has("contactEmails")) {
                    const emails = parseContactEmails((data as any).contactEmails as string);
                    for (let i = 0; i < emails.length; i++) {
                      const e = emails[i];
                      await tx.teacherContactEmail.create({ data: { teacherId: createdTeacher.teacherId, email: e.email, notes: e.notes ?? null, order: i } });
                    }
                  }

                  result.created!++;
                } else {
                  // Update existing user's teacher or create if absent
                  const existing = await tx.teacher.findFirst({ where: { userId }, select: { teacherId: true } });
                  if (existing) {
                    const teacherUpdate: any = {};
                    if ((data as any).name != null) teacherUpdate.name = (data as any).name;
                    if (fieldsInRow.has("kanaName")) teacherUpdate.kanaName = (data as any).kanaName ?? null;
                    if (fieldsInRow.has("birthDate")) teacherUpdate.birthDate = (data as any).birthDate ?? null;
                    if (fieldsInRow.has("notes")) teacherUpdate.notes = (data as any).notes ?? null;
                    if (fieldsInRow.has("phoneNumber")) teacherUpdate.phoneNumber = (data as any).phoneNumber ?? null;
                    if (fieldsInRow.has("phoneNotes")) teacherUpdate.phoneNotes = (data as any).phoneNotes ?? null;
                    if (fieldsInRow.has("status") && data.status !== undefined) teacherUpdate.status = data.status ?? undefined;
                    await tx.teacher.update({ where: { teacherId: existing.teacherId }, data: teacherUpdate });
                    result.updated!++;

                    // Contact phones
                    if (fieldsInRow.has("contactPhones")) {
                      const phones = parseContactPhones((data as any).contactPhones as string);
                      await tx.teacherContactPhone.deleteMany({ where: { teacherId: existing.teacherId } });
                      for (let i = 0; i < phones.length; i++) {
                        const p = phones[i];
                        await tx.teacherContactPhone.create({ data: { teacherId: existing.teacherId, phoneNumber: p.number, notes: p.notes ?? null, order: i } });
                      }
                    }

                    // Contact emails
                    if (fieldsInRow.has("contactEmails")) {
                      const emails = parseContactEmails((data as any).contactEmails as string);
                      await tx.teacherContactEmail.deleteMany({ where: { teacherId: existing.teacherId } });
                      for (let i = 0; i < emails.length; i++) {
                        const e = emails[i];
                        await tx.teacherContactEmail.create({ data: { teacherId: existing.teacherId, email: e.email, notes: e.notes ?? null, order: i } });
                      }
                    }
                  } else {
                    const created = await tx.teacher.create({ data: {
                      userId,
                      name: (data as any).name!,
                      kanaName: (data as any).kanaName || null,
                      email: (data as any).email || null,
                      notes: (data as any).notes || null,
                      status: (data as any).status ?? 'ACTIVE',
                      birthDate: (data as any).birthDate || null,
                      phoneNumber: (data as any).phoneNumber || null,
                      phoneNotes: (data as any).phoneNotes || null,
                    } , select: { teacherId: true } });
                    result.created!++;

                    // Contact phones
                    if (fieldsInRow.has("contactPhones")) {
                      const phones = parseContactPhones((data as any).contactPhones as string);
                      await tx.teacherContactPhone.deleteMany({ where: { teacherId: created.teacherId } });
                      for (let i = 0; i < phones.length; i++) {
                        const p = phones[i];
                        await tx.teacherContactPhone.create({ data: { teacherId: created.teacherId, phoneNumber: p.number, notes: p.notes ?? null, order: i } });
                      }
                    }

                    // Contact emails
                    if (fieldsInRow.has("contactEmails")) {
                      const emails = parseContactEmails((data as any).contactEmails as string);
                      await tx.teacherContactEmail.deleteMany({ where: { teacherId: created.teacherId } });
                      for (let i = 0; i < emails.length; i++) {
                        const e = emails[i];
                        await tx.teacherContactEmail.create({ data: { teacherId: created.teacherId, email: e.email, notes: e.notes ?? null, order: i } });
                      }
                    }
                  }

                  // Update user if values provided
                  const userUpdate: any = {};
                  if ((data as any).username != null) userUpdate.username = (data as any).username;
                  if ((data as any).email !== undefined) userUpdate.email = (data as any).email || null;
                  if ((data as any).password) userUpdate.passwordHash = (data as any).password;
                  if (Object.keys(userUpdate).length > 0) {
                    await tx.user.update({ where: { id: userId }, data: userUpdate });
                  }

                  // Branches if provided
                  if (fieldsInRow.has("branches") && data.branchIds) {
                    await tx.userBranch.deleteMany({ where: { userId } });
                    if (data.branchIds.length > 0) {
                      for (const bId of data.branchIds) {
                        await tx.userBranch.create({ data: { userId, branchId: bId } });
                      }
                    } else if (branchId) {
                      await tx.userBranch.create({ data: { userId, branchId } });
                    }
                  }

                  // Replace subject preferences when provided
                  if (fieldsInRow.has("subjects")) {
                    await tx.userSubjectPreference.deleteMany({ where: { userId } });
                    const tuples = data.subjectPrefTuples || [];
                    for (const t of tuples) {
                      await tx.userSubjectPreference.create({ data: { userId, subjectId: t.subjectId, subjectTypeId: t.subjectTypeId } });
                    }
                  }
                }

                result.success++;
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
          }
        });
      }
    }

    // Attach error CSV when requested
    if (returnErrorsCsv && result.errors.length > 0) {
      try {
        const headers = [...actualHeaders, "エラー"];
        const lines: string[] = [];
        const errorRows = new Map<number, string>(
          result.errors.map(e => [e.row, e.errors.join("; ")])
        );
        const errorFilename = `teacher_import_errors_${new Date().toISOString().slice(0,10)}.csv`;
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
