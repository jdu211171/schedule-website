# Data Model: Production CSV Import Reliability

## Entities

### ImportSession

- id: string (UUID)
- userId: string
- filename: string
- sizeBytes: number
- encoding: enum("UTF-8", "Shift_JIS")
- status: enum("pending", "running", "succeeded", "failed")
- startedAt: datetime
- completedAt: datetime | null
- processedCount: number (>=0)
- createdCount: number (>=0)
- updatedCount: number (>=0)
- skippedCount: number (>=0)
- summaryMessage: string
- errorsUri: string | null (downloadable CSV/JSON of row errors)

Constraints:

- processedCount = createdCount + updatedCount + skippedCount
- completedAt required iff status in {succeeded, failed}

Relationships:

- ImportSession has many ImportError

State transitions:

- pending → running → succeeded | failed

### ImportError

- id: string (UUID)
- sessionId: string (FK → ImportSession.id)
- rowNumber: number (1-based)
- column: string | null
- reason: string (localized key + message)
- code: string (e.g., "invalid_format", "missing_required", "constraint_violation")

### ImportFile (ephemeral)

- filename: string
- sizeBytes: number
- encodingDetected: enum("UTF-8", "Shift_JIS")
- delimiter: string ("," or ";"; default ",")

## Validation Rules

- CSV must include internal database ID column for upsert (name defined by UI/Docs)
- Encoding must be UTF-8 or Shift_JIS
- File size must be ≤ hard cap (provisional 25 MB)
- Rows must validate against `import-row-schema` (Zod)

## Notes

- ImportError storage can be in-memory + downloadable artifact for large runs to avoid DB bloat; persist counts + summary in ImportSession.
- For observability, record durations and size metrics per session.
