type ImportSummary = {
  entity: string;
  filename?: string;
  encoding?: string | null;
  processed: number;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  errors?: number;
  durationMs: number;
};

export function auditImportSummary(summary: ImportSummary) {
  // Structured log; avoid PII in values
  // eslint-disable-next-line no-console
  console.info("import.summary", JSON.stringify(summary));
}

