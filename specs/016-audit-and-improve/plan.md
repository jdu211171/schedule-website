# Implementation Plan: Notification Sending Pipeline — Reliability & Efficiency

**Branch**: `016-audit-and-improve` | **Date**: 2025-10-10 | **Spec**: specs/016-audit-and-improve/spec.md
**Input**: Feature specification from `/specs/016-audit-and-improve/spec.md`

## Summary

Strengthen the cron-triggered LINE notification pipeline for reliability, efficiency, and speed with minimal code changes. Preserve existing routes and data model; add explicit idempotency keys (queue-level and group-level), enforce conservative batching/concurrency, adopt structured metrics/logs, and define safe retry/backoff with circuit-breaker behavior. Roll out in guarded phases with a rollback path.

## Technical Context

**Language/Version**: TypeScript (Next.js App Router), Node 18+ on Vercel; Bun for scripts  
**Primary Dependencies**: Next.js, Prisma, date-fns/date-fns-tz, axios  
**Storage**: PostgreSQL via Prisma (existing Notification/Line* models)  
**Testing**: Vitest + React Testing Library (preferred), ad-hoc route verification  
**Target Platform**: Vercel serverless functions; local dev via `bun dev`  
**Project Type**: web (Next.js monorepo)  
**Performance Goals**: 95% cycles finish within 3 minutes of window; 99% within 10 minutes  
**Constraints**: Per-request timeout 5s; max concurrency 3; delay between batches 1s; p95 duplicate rate = 0  
**Scale/Scope**: Typical daily recipients per branch ≤ 500; grouped multicast per channel; backlog auto-clears within same day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Simplicity first: Minimal-change plan; no schema change required (PASS)
- Testability: Deterministic idempotency and metrics enable verification (PASS)
- Observability: Structured logs + metrics defined (PASS)
- Security: No secrets in repo; honor auth on cron route (PASS)
- Versioning/Compatibility: Preserve current routes and response shapes (PASS)

## Project Structure

### Documentation (this feature)

```
specs/016-audit-and-improve/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (OpenAPI)
```

### Source Code (repository root)

```
src/
├── app/
│   └── api/notifications/unified-cron/route.ts       # Cron entry
├── lib/
│   ├── notification/notification-worker.ts           # Worker
│   ├── notification/notification-service.ts          # Queue add/dedupe
│   └── line-multi-channel.ts                         # LINE integration
prisma/schema.prisma                                  # Models/indices
```

**Structure Decision**: Leverage existing Next.js routes and libs; add configuration/env toggles and small, targeted enhancements within current files to meet requirements.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

