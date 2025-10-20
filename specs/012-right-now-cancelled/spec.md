# Feature Specification: Exclude Cancelled Lessons from Conflict Detection in Day Calendar

**Feature Branch**: `012-right-now-cancelled`  
**Created**: 2025-10-07  
**Status**: Draft  
**Input**: User description: "Right now cancelled lesson cards in the day calendar are showing up as conflicts when キャンセル授業を表示 is toggled on, but since those sessions are cancelled we don’t want them to appear in the UI as conflicts. Can we adjust the logic to avoid this? Most of the work seems to be in these files: src/components/admin-schedule/DayCalendar/lesson-card.tsx src/components/admin-schedule/DayCalendar/admin-calendar-day.tsx"

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

## Clarifications

### Session 2025-10-07

- Q: What exactly defines a “cancelled” lesson for conflict exclusion? → A: A lesson is treated as cancelled when its cancellation flag is set (cancelled = true), independent of any status label.

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a scheduling admin viewing the Day Calendar, I can toggle "キャンセル授業を表示" (Show cancelled lessons) to see cancelled lessons for context, but cancelled lessons do not create or contribute to conflict indicators. Only active (non-cancelled) lessons should be considered for conflict detection.

### Acceptance Scenarios

1. Given a day with one active lesson and one overlapping cancelled lesson, When "キャンセル授業を表示" is ON, Then both lessons are visible but no conflict indicator appears due to the cancelled lesson; the active lesson is not marked as conflicting solely because of overlap with the cancelled lesson.
2. Given a day with two overlapping active lessons, When "キャンセル授業を表示" is ON or OFF, Then a conflict indicator is shown between those active lessons.
3. Given a day with two overlapping cancelled lessons, When "キャンセル授業を表示" is OFF, Then no lessons are shown and no conflict appears; When it is ON, Then the cancelled lessons are visible but no conflict indicators are shown.
4. Given a day where a lesson changes status from active to cancelled, When the status updates, Then any conflict indicators previously caused by that lesson disappear on the next render/update.

### Edge Cases

- Definition of “cancelled” is the dedicated cancellation flag (not a status string). Both teacher- and student‑initiated cancellations are excluded from conflicts.
- How to treat rescheduled lessons where the original is cancelled and a new time exists—ensure only the active instance participates in conflicts.
- Ensure conflict aggregation or summary counts (if any) also exclude cancelled lessons from conflict math.
- Toggling "キャンセル授業を表示" should not change conflict outcomes, only visibility of cancelled lessons.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST exclude cancelled lessons from conflict detection logic in the Day Calendar.
- **FR-002**: The "キャンセル授業を表示" toggle MUST control visibility of cancelled lessons only; it MUST NOT alter which lessons count toward conflicts.
- **FR-003**: Conflict indicators (badges, highlights, warnings) MUST NOT be rendered for cancelled lessons and MUST NOT be shown for active lessons solely due to overlapping cancelled lessons.
- **FR-004**: Any conflict summaries or counts (if present) MUST reflect conflicts among active lessons only, excluding cancelled ones.
- **FR-005**: When a lesson’s status changes between active and cancelled, the conflict state MUST update accordingly on the next render/update.
- **FR-006**: The system MUST define “cancelled” as lessons where the dedicated cancellation flag is set; status labels (e.g., CONFLICTED/CONFIRMED) do not imply cancellation.
- **FR-007**: Visual styling for cancelled lessons MAY remain distinct (e.g., muted or labelled), but MUST NOT imply conflict. [NEEDS CLARIFICATION: desired visual treatment]
- **FR-008**: Performance and responsiveness of the Day Calendar MUST be maintained; conflict evaluation changes MUST NOT materially degrade performance.
- **FR-009**: Accessibility MUST be preserved; conflict indicators and cancelled states MUST remain perceivable and understandable via assistive technologies.

### Key Entities _(include if feature involves data)_

- **Lesson**: Represents a scheduled session with key attributes including start time, end time, participants (e.g., teacher, student), a status label for operational states (e.g., CONFLICTED/CONFIRMED), and a separate cancellation flag. Conflict participation is determined by the cancellation flag (cancelled lessons are excluded).
- **Day Calendar View**: The daily UI surface that lists lessons and shows conflicts. Visibility is controlled by the "キャンセル授業を表示" toggle; conflict logic considers active lessons only.
- **Conflict**: A derived relationship indicating overlapping time among active lessons. Excludes any lesson marked cancelled by the cancellation flag.

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

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
