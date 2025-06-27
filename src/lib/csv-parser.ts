import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";

export interface ParseOptions {
  encoding?: "utf-8" | "shift_jis";
  columns?: boolean | string[];
  skip_empty_lines?: boolean;
  trim?: boolean;
}

export interface ParseResult<T = any> {
  data: T[];
  errors: Array<{ row: number; error: string }>;
}

export class CSVParser {
  static async parseFile<T = any>(
    file: File,
    options: ParseOptions = {}
  ): Promise<ParseResult<T>> {
    const {
      encoding = "utf-8",
      columns = true,
      skip_empty_lines = true,
      trim = true,
    } = options;

    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      return this.parseBuffer(Buffer.from(buffer), options);
    } catch (error) {
      return {
        data: [],
        errors: [
          {
            row: 0,
            error: error instanceof Error ? error.message : "Failed to parse CSV file",
          },
        ],
      };
    }
  }

  static async parseBuffer<T = any>(
    buffer: Buffer,
    options: ParseOptions = {}
  ): Promise<ParseResult<T>> {
    const {
      encoding = "utf-8",
      columns = true,
      skip_empty_lines = true,
      trim = true,
    } = options;

    try {
      // Skip detection if encoding is explicitly provided as utf-8
      let finalEncoding = encoding;
      if (encoding !== "utf-8") {
        // Only detect encoding if not explicitly set to utf-8
        const detectedEncoding = this.detectEncoding(new Uint8Array(buffer));
        finalEncoding = detectedEncoding || encoding;
      }
      
      // Convert to string with proper encoding
      let csvContent: string;
      if (finalEncoding === "shift_jis") {
        csvContent = iconv.decode(buffer, "Shift_JIS");
      } else {
        csvContent = buffer.toString("utf-8");
      }

      // Remove BOM if present
      csvContent = csvContent.replace(/^\uFEFF/, "");

      // Parse CSV
      const records = parse(csvContent, {
        columns,
        skip_empty_lines,
        trim,
        relax_quotes: true,
        relax_column_count: true,
      });

      return {
        data: records as T[],
        errors: [],
      };
    } catch (error) {
      return {
        data: [],
        errors: [
          {
            row: 0,
            error: error instanceof Error ? error.message : "Failed to parse CSV file",
          },
        ],
      };
    }
  }

  private static detectEncoding(buffer: Uint8Array): "utf-8" | "shift_jis" | null {
    // Check for UTF-8 BOM
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "utf-8";
    }

    // Try to detect Shift-JIS by checking for common Japanese character patterns
    let shiftJisScore = 0;
    let utf8Score = 0;

    for (let i = 0; i < Math.min(buffer.length - 1, 1000); i++) {
      const byte1 = buffer[i];
      const byte2 = buffer[i + 1];

      // Check for Shift-JIS patterns
      if (
        (byte1 >= 0x81 && byte1 <= 0x9f) ||
        (byte1 >= 0xe0 && byte1 <= 0xef)
      ) {
        if (
          (byte2 >= 0x40 && byte2 <= 0x7e) ||
          (byte2 >= 0x80 && byte2 <= 0xfc)
        ) {
          shiftJisScore++;
          i++; // Skip the second byte
        }
      }

      // Check for UTF-8 patterns
      if (byte1 >= 0xc0 && byte1 <= 0xdf) {
        if (byte2 >= 0x80 && byte2 <= 0xbf) {
          utf8Score++;
          i++;
        }
      } else if (byte1 >= 0xe0 && byte1 <= 0xef) {
        if (
          byte2 >= 0x80 &&
          byte2 <= 0xbf &&
          i + 2 < buffer.length &&
          buffer[i + 2] >= 0x80 &&
          buffer[i + 2] <= 0xbf
        ) {
          utf8Score++;
          i += 2;
        }
      }
    }

    // Return the encoding with higher score
    if (shiftJisScore > utf8Score) {
      return "shift_jis";
    } else if (utf8Score > 0) {
      return "utf-8";
    }

    return null;
  }

  static generateCSV(data: any[], columns: string[]): string {
    // Add BOM for Excel compatibility
    const BOM = "\uFEFF";
    
    // Create header
    const header = columns.join(",");
    
    // Create rows
    const rows = data.map(item => {
      return columns
        .map(col => {
          const value = item[col];
          // Escape values containing comma, quotes, or newlines
          if (value == null) return "";
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",");
    });
    
    return BOM + header + "\n" + rows.join("\n");
  }
}

export function validateCSVHeaders(
  actualHeaders: string[],
  expectedHeaders: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for missing headers
  const missingHeaders = expectedHeaders.filter(
    header => !actualHeaders.includes(header)
  );
  
  if (missingHeaders.length > 0) {
    errors.push(
      `Missing required columns: ${missingHeaders.join(", ")}`
    );
  }
  
  // Check for extra headers (warning only)
  const extraHeaders = actualHeaders.filter(
    header => !expectedHeaders.includes(header)
  );
  
  if (extraHeaders.length > 0) {
    errors.push(
      `Unknown columns: ${extraHeaders.join(", ")}`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}