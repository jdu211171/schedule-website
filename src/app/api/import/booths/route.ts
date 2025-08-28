import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  boothImportSchema,
  REQUIRED_BOOTH_CSV_HEADERS,
  type BoothImportData,
  type ImportResult,
  formatValidationErrors
} from "@/schemas/import";
import { z } from "zod";
import { handleImportError } from "@/lib/import-error-handler";

async function handleImport(req: NextRequest, session: any) {
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
      "ブース名": "name",
      "校舎": "branchName",
      "ステータス": "status",
      "表示順": "order",
    };

    let actualHeaders = Object.keys(parseResult.data[0]);
    const requiredHeaders = [...REQUIRED_BOOTH_CSV_HEADERS];
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
    const validatedData: (BoothImportData & { branchId: string })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    // Create a map of branch names to IDs for efficiency
    const branches = await prisma.branch.findMany({
      select: { branchId: true, name: true }
    });
    const branchMap = new Map(branches.map(b => [b.name, b.branchId]));

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        const id = (row as any).id as string | undefined;

        // Validate row data
        const validated = boothImportSchema.parse(row);

        // Resolve branch
        const branchId = branchMap.get(validated.branchName);
        if (!branchId) {
          result.errors.push({
            row: rowNumber,
            errors: [`支店「${validated.branchName}」が見つかりません`]
          });
          continue;
        }

        if (id) {
          const existing = await prisma.booth.findUnique({ where: { boothId: id } });
          if (existing) {
            await prisma.booth.update({
              where: { boothId: id },
              data: {
                name: validated.name,
                status: validated.status,
                branchId,
                order: validated.order,
              },
            });
            result.success++;
            continue;
          }
        }

        // Upsert by branch + name if no ID
        const existingBooth = await prisma.booth.findFirst({
          where: { name: validated.name, branchId },
        });
        if (existingBooth) {
          await prisma.booth.update({
            where: { boothId: existingBooth.boothId },
            data: {
              status: validated.status,
              order: validated.order ?? existingBooth.order,
            },
          });
          result.success++;
          continue;
        }

        validatedData.push({ ...validated, branchId });
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
          await tx.booth.create({
            data: {
              name: data.name,
              status: data.status,
              branchId: data.branchId,
              order: data.order
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

export const POST = withRole(["ADMIN", "STAFF"], handleImport);
