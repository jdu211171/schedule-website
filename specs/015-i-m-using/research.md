# Research: Production CSV Import Reliability

## Decisions

- Decision: Skip invalid rows; process valid rows (per-row atomicity)
  - Rationale: Maximizes throughput and usability; avoids blocking entire import; aligns with business need to import what’s good now and fix the rest later.
  - Alternatives considered: Abort on first error; Full-file validation gate before import.

- Decision: Support encodings UTF-8 and Shift_JIS; reject others with guidance
  - Rationale: Covers common JP CSVs; keeps scope bounded; clear error path for conversion.
  - Alternatives considered: Auto-detect broader set (CP932, EUC-JP) with complexity and false-positives risk.

- Decision: Upsert using internal database ID (from CSV) as the unique key
  - Rationale: Deterministic mapping to existing records; avoids domain ambiguities.
  - Alternatives considered: External business key; composite keys.

- Decision: Typical performance target ≤10 MB or ≤10k rows in ≤60s
  - Rationale: Matches product expectations and UX requirements; feasible with streaming parse and batched upserts.
  - Alternatives considered: Larger targets with increased operational risk and timeouts.

- Decision (provisional): Concurrency guard = 1 active import per user; queue additional requests
  - Rationale: Prevents contention and rate spikes; simplifies resource planning; adjustable later.
  - Alternatives considered: Global serial import; N-per-project throttling.

- Decision (provisional): Hard cap = 25 MB or 50k rows per file
  - Rationale: Safety limit beyond typical target; protects memory and timeouts; adjustable later.
  - Alternatives considered: No cap; higher caps with elevated failure risk.

- Decision: Localized errors JP/EN; avoid generic messages
  - Rationale: Clear operator feedback; reduces repeated failures.
  - Alternatives considered: English-only; generic fallback.

- Decision: Observability via audit logs and metrics
  - Rationale: Debuggability for production parity; track counts and durations.
  - Alternatives considered: Minimal logs.

## Open Questions (non-blocking)

- Exact concurrency and rate thresholds (org-wide vs per-user vs per-route)
- Final hard cap confirmation from ops (MB and row limits)

## References

- Feature Spec: /Users/muhammadnurislomtukhtamishhoji-zoda/Development/schedule-website/specs/015-i-m-using/spec.md
