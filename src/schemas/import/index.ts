export * from "./branch-import.schema";
export * from "./admin-import.schema";
export * from "./staff-import.schema";
export * from "./subject-import.schema";
export * from "./subject-type-import.schema";
export * from "./student-type-import.schema";
export * from "./booth-import.schema";
export * from "./class-type-import.schema";
export * from "./holiday-import.schema";
export * from "./teacher-import.schema";
export * from "./student-import.schema";

// Common types for import results
export interface ImportResult {
  success: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
  warnings: Array<{
    row?: number;
    warnings?: string[];
    message?: string;
    type?: string;
  }>;
}

// Helper function to format validation errors
export function formatValidationErrors(
  errors: any[],
  row: number
): { row: number; errors: string[] } {
  return {
    row,
    errors: errors.map(err => {
      if (err.path && err.path.length > 0) {
        return `${err.path.join(".")}: ${err.message}`;
      }
      return err.message;
    }),
  };
}