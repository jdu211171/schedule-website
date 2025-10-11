import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { CSVParser } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import {
  classTypeImportSchema,
  REQUIRED_CLASS_TYPE_CSV_HEADERS,
  type ClassTypeImportData,
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

    // Remap localized headers (exported) to schema keys for import
    const headerMap: Record<string, string> = {
      "ID": "id",
      "授業タイプ名": "name",
      "備考": "notes",
      "親タイプ": "parentName",
      "表示順": "order",
    };

    let actualHeaders = Object.keys(parseResult.data[0]);
    const requiredHeaders = [...REQUIRED_CLASS_TYPE_CSV_HEADERS];
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
    const validatedData: (ClassTypeImportData & { parentId?: string })[] = [];
    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: []
    };

    // Create a map of class type names to IDs for parent lookup
    const existingClassTypes = await prisma.classType.findMany({
      select: { classTypeId: true, name: true }
    });
    const classTypeMap = new Map(existingClassTypes.map(ct => [ct.name, ct.classTypeId]));

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = i + 2; // +1 for header, +1 for 1-based indexing

      try {
        const id = (row as any).id as string | undefined;

        // Validate row data
        const validated = classTypeImportSchema.parse(row);

        // Resolve parent if provided
        let parentId: string | undefined;
        if (validated.parentName) {
          parentId = classTypeMap.get(validated.parentName);
          if (!parentId) {
            result.errors.push({
              row: rowNumber,
              errors: [`親授業タイプ「${validated.parentName}」が見つかりません`]
            });
            continue;
          }
        }

        if (id) {
          const existing = await prisma.classType.findUnique({ where: { classTypeId: id } });
          if (existing) {
            await prisma.classType.update({
              where: { classTypeId: id },
              data: {
                name: validated.name,
                notes: validated.notes ?? null,
                parentId: parentId ?? existing.parentId,
                order: validated.order ?? existing.order,
              },
            });
            result.success++;
            continue;
          }
        }

        // Upsert by name if no ID
        const existingClassType = await prisma.classType.findFirst({
          where: { name: validated.name },
        });

        if (existingClassType) {
          await prisma.classType.update({
            where: { classTypeId: existingClassType.classTypeId },
            data: {
              notes: validated.notes ?? existingClassType.notes,
              parentId: parentId ?? existingClassType.parentId,
              order: validated.order ?? existingClassType.order,
            },
          });
          result.success++;
          continue;
        }

        validatedData.push({ ...validated, parentId });
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
    // We need to handle hierarchical data carefully - parents must be created before children
    if (validatedData.length > 0) {
      await prisma.$transaction(async (tx) => {
        // First, create all class types without parents
        const withoutParent = validatedData.filter(d => !d.parentId);
        for (const data of withoutParent) {
          const created = await tx.classType.create({
            data: {
              name: data.name,
              notes: data.notes,
              order: data.order
            }
          });
          // Update the map for subsequent parent lookups
          classTypeMap.set(created.name, created.classTypeId);
          result.success++;
        }

        // Then, create class types with parents
        const withParent = validatedData.filter(d => d.parentId);
        for (const data of withParent) {
          // Re-check parent ID in case it was just created
          let parentId = data.parentId;
          if (!parentId && data.parentName) {
            parentId = classTypeMap.get(data.parentName);
          }

          await tx.classType.create({
            data: {
              name: data.name,
              notes: data.notes,
              parentId: parentId,
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
