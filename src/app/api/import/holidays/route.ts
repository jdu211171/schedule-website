import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  holidayImportSchema,
  REQUIRED_HOLIDAY_CSV_HEADERS,
  type HolidayImportData,
  type ImportResult,
  formatValidationErrors
} from "@/schemas/import";
import { z } from "zod";
import { handleImportError } from "@/lib/import-error-handler";

async function handleImport(req: NextRequest, session: any, branchId: string) {
  try {
    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    // Enforce server-side max size (hard cap)
    const maxBytes = Number.parseInt(process.env.IMPORT_MAX_BYTES || "26214400", 10); // 25MB
    const fileSize = (file as Blob).size ?? 0;
    if (fileSize > maxBytes) {
      return NextResponse.json(
        { error: `ファイルサイズが大きすぎます。最大 ${Math.floor(maxBytes / 1024 / 1024)}MB まで対応しています` },
        { status: 413 }
      );
    }
    // Convert file to buffer
    const buffer = Buffer.from(await (file as Blob).arrayBuffer());

    // Parse CSV file
    const parseResult = await CSVParser.parseBuffer<Record<string, string>>(buffer);

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSVファイルの解析に失敗しました",
          details: parseResult.errors
        },
        { status: 400 }
      );
    }

    // Validate CSV headers
    if (parseResult.data.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルが空です" },
        { status: 400 }
      );
    }

    // Remap localized headers (export) to schema keys for import
    const headerMap: Record<string, string> = {
      "ID": "id",
      "休日名": "name",
      "開始日": "startDate",
      "終了日": "endDate",
      "繰り返し": "isRecurring",
      "備考": "description",
    };

    let actualHeaders = Object.keys(parseResult.data[0]);
    const requiredHeaders = [...REQUIRED_HOLIDAY_CSV_HEADERS];
    let missingHeaders = requiredHeaders.filter((h) => !actualHeaders.includes(h));

    if (missingHeaders.length > 0) {
      const canRemap = actualHeaders.some((h) => headerMap[h]);
      if (canRemap) {
        parseResult.data = parseResult.data.map((row) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            out[headerMap[k] ?? k] = v as string;
          }
          return out;
        }) as any;
        actualHeaders = Object.keys(parseResult.data[0]);
        missingHeaders = requiredHeaders.filter((h) => !actualHeaders.includes(h));
      }
    }

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `必須列が不足しています: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    // Process and validate each row
    const validatedData: HolidayImportData[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        const id = (row as any).id as string | undefined;

        // Validate row data
        const validated = holidayImportSchema.parse(row);

        if (id) {
          const existing = await prisma.vacation.findUnique({ where: { id } });
          if (existing) {
            await prisma.vacation.update({
              where: { id },
              data: {
                name: validated.name,
                startDate: validated.startDate,
                endDate: validated.endDate,
                isRecurring: validated.isRecurring,
                notes: validated.description ?? existing.notes,
              },
            });
            result.success++;
            continue;
          }
        }

        // Upsert by unique combo if no ID
        const existingHoliday = await prisma.vacation.findFirst({
          where: {
            name: validated.name,
            startDate: validated.startDate,
            endDate: validated.endDate,
            branchId,
          },
        });

        if (existingHoliday) {
          await prisma.vacation.update({
            where: { id: existingHoliday.id },
            data: {
              isRecurring: validated.isRecurring,
              notes: validated.description ?? existingHoliday.notes,
            },
          });
          result.success++;
          continue;
        }

        validatedData.push(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          result.errors.push(formatValidationErrors(error.errors, rowNumber));
        } else {
          result.errors.push({
            row: rowNumber,
            errors: [error instanceof Error ? error.message : "データ検証中にエラーが発生しました"]
          });
        }
      }
    }

    // If there are critical errors, don't proceed with import
    if (result.errors.length > 0 && validatedData.length === 0) {
      return NextResponse.json(result, { status: 400 });
    }

    // Import valid data in a transaction
    if (validatedData.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const data of validatedData) {
          await tx.vacation.create({
            data: {
              name: data.name,
              startDate: data.startDate,
              endDate: data.endDate,
              isRecurring: data.isRecurring,
              notes: data.description,
              branchId,
            }
          });
          result.success++;
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleImportError(error);
  }
}

export const POST = withBranchAccess(["ADMIN", "STAFF"], handleImport);
