# Feature Specification: Production CSV Import Reliability

**Feature Branch**: `015-i-m-using`  
**Created**: 2025-10-08  
**Status**: Draft  
**Input**: User description: "I'm using Supabase to deploy this website and as the PostgreSQL database. While CSV import works quickly on my local Postgres, in production on the deployed website it fails with this error: インポート中に予期しないエラーが発生しました。データを確認して、もう一度お試しください。 We need to fix this immediately. I don’t think it’s a database issue, but rather a source code problem, since other systems using AWS or Supabase handle CSV import/export reliably and fast. Can we investigate and resolve this?"

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As an authorized staff user, I can upload a CSV file to import records into the system from the production website, and the import completes reliably with clear feedback about success, progress, and any row-level issues. If the import fails, I receive a specific, localized error message with guidance to resolve it.

### Acceptance Scenarios

1. **Given** a valid CSV within supported limits, **When** the user uploads it and confirms import, **Then** the system validates the file, performs the import, and reports success with counts of created/updated/failed rows.
2. **Given** a CSV with header/column mismatches, **When** the user uploads it, **Then** the system blocks the import with a clear explanation of expected columns and an example template.
3. **Given** a CSV containing some invalid rows, **When** import runs, **Then** the system processes valid rows and skips invalid ones, returning a detailed report with row numbers and reasons for each skipped row.
4. **Given** a CSV row that matches an existing record by the unique identifier (internal database ID), **When** import runs, **Then** the existing record is updated (upsert), and the result summary reflects the update count.
5. **Given** a large but supported CSV, **When** import runs, **Then** the UI shows progress or a non-blocking status and completes within ≤60s for typical imports (≤10 MB or ≤10k rows).
6. **Given** an unsupported file (wrong type/encoding), **When** the user tries to import, **Then** the system prevents the action and displays a localized error (Japanese/English) specifying the required format (CSV encoded as UTF-8 or Shift_JIS), with guidance to convert if needed.
7. **Given** a transient failure (network/service disruption), **When** the user retries, **Then** the import succeeds or provides actionable error details without generic messages.

### Edge Cases

- Extremely large files near the maximum size limit [NEEDS CLARIFICATION: exact max MB and row count].
- Encodings: support UTF-8 and Shift_JIS; reject others with a clear guidance message.
- Duplicates: when a row matches an existing record by the unique identifier, update the existing record (upsert); otherwise create a new record.
- Concurrent imports by multiple users [NEEDS CLARIFICATION: concurrency and rate limits].
- Partial imports: valid rows commit; invalid rows are skipped with detailed reasons (per-row atomicity).
- CSVs with quoted commas, multi-line fields, or BOM markers.

## Clarifications

### Session 2025-10-08

- Q: How should the importer handle invalid rows in a CSV? → A: Import valid rows; skip invalid; detailed report.
- Q: Which CSV encodings must be supported? → A: UTF-8 and Shift_JIS.
- Q: How should duplicates be handled when a CSV row matches an existing record by its unique identifier? → A: Upsert: update existing; create if missing.
- Q: Which field serves as the unique key for matching rows to existing records? → A: Internal database ID present in CSV.
- Q: What performance target should we guarantee for a “typical” import? → A: ≤10 MB or ≤10k rows in ≤60s.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow authorized users to upload and import CSV files to create/update records from the production site.
- **FR-002**: System MUST validate CSV structure (headers, required columns, data types) before performing any changes and stop with a clear message if invalid.
- **FR-003**: System MUST present specific, localized errors instead of generic messages (Japanese and English) when validation/import fails.
- **FR-004**: System MUST provide a summary after import: total rows processed, created, updated, skipped/failed with reasons.
- **FR-005**: System MUST complete typical imports of ≤10 MB or ≤10k rows within ≤60 seconds from user confirmation to result.
- **FR-006**: System MUST process valid rows and skip invalid ones, returning a detailed error report (row numbers and reasons) for all skipped rows.
- **FR-007**: System MUST accept CSVs encoded as UTF-8 or Shift_JIS and reject other encodings with precise guidance to convert.
- **FR-008**: System MUST protect the operation with appropriate authorization and audit logging of attempts, outcomes, and counts.
- **FR-009**: System MUST avoid double-processing on user retries (idempotent behavior) or clearly communicate how to safely retry.
- **FR-010**: System MUST provide a downloadable CSV template and column dictionary for users to prepare valid files.
- **FR-011**: System MUST handle concurrency limits and provide user feedback if import capacity is exceeded [NEEDS CLARIFICATION: concurrency/rate thresholds].
- **FR-012**: System MUST perform upsert behavior using the internal database ID provided in the CSV: update existing records when matched; create new records when not found.

### Key Entities _(include if feature involves data)_

- **Import Session**: Represents a single import attempt; attributes include start/end time, status (pending/succeeded/failed), counts (processed/created/updated/failed), user, and summary message.
- **Import File**: The uploaded CSV descriptor; attributes include filename, size, declared delimiter, detected encoding (UTF-8 or Shift_JIS), and a designated internal database ID column used for record matching during upsert.
- **Import Error**: Row-level issue captured during validation/import; attributes include row number, column, and reason shown to the user.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
