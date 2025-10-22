# Feature Specification: Instant day calendar update after session creation

**Feature Branch**: `013-when-i-create`  
**Created**: 2025-10-07  
**Status**: Draft  
**Input**: User description: "When I create a regular class session from the day calendar or class series, it doesn’t automatically appear in the day calendar and I have to refresh the page to see it. Can we fix this so the new session shows up immediately without refreshing?"

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

- Q: Should new session updates propagate in real time beyond the tab where creation happened? → A: All tabs for the same user update automatically.
- Q: Which time zone should the day calendar use to place and display newly created sessions? → A: Fixed global time zone — Asia/Tokyo (per existing project convention).
- Q: When a newly created session is hidden by active filters, what feedback should the user receive? → A: Show generic success toast; no filter-specific message.
- Q: For class series, does creating a session happen on the same page (popup) or a different page? → A: Same page popup (modal/drawer), aligned with existing project patterns.
- Q: After creating a session, should the calendar auto-scroll to the new session? → A: Do not auto-scroll; keep current scroll position.

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a scheduler (or teacher/administrator), when I create a regular class session from the day calendar or from a class series context, the newly created session should appear immediately in the day calendar without requiring a manual page refresh, so I can confirm scheduling changes in real time and proceed with further actions confidently.

### Acceptance Scenarios

1. Given the day calendar is open on date D with no filters that would hide the new session, When I create a new session on date D from the day calendar flow, Then the session tile appears in the correct time slot on the day calendar within 1 second, without a full page reload.
2. Given the day calendar is open on date D and a session is created for date D from a class series popup on the same page, When I complete the creation, Then the new session appears in the day calendar on date D within 1 second, without a full page reload.
3. Given the day calendar is open on date D with active filters that exclude the new session (e.g., filtered to Teacher A but the session is for Teacher B), When I create the session, Then the session does not appear in the current view and a generic success toast is shown; no filter-specific message or auto filter changes occur.
4. Given the day calendar is open on date D, When I create a session on a different date D2, Then the current day calendar for D does not change and I receive confirmation of creation; if I navigate to D2, the new session is present. [NEEDS CLARIFICATION: Should the UI offer a quick jump to the created date?]
5. Given I create a session and the creation fails (e.g., validation or server error), When the error occurs, Then no new session appears in the calendar and I see a clear error message; any temporary UI indicator should be cleared.
6. Given the same user has the day calendar open in another tab on date D, When a new session is created for date D in one tab, Then the other tab displays the new session within 1 second without a full page reload.

### Edge Cases

- Overlapping sessions: If the new session overlaps with existing sessions, the day calendar displays it according to established overlap rules; no duplicate or ghost tiles are shown. [Assumes existing overlap visualization rules]
- Duplicate submissions: If the user double-submits, only one session appears; the UI prevents or deduplicates duplicates.
- Time zones: The day calendar uses Asia/Tokyo for display; sessions appear at the correct Japan local time. Data storage conventions remain as-is.
- Background tabs: If the same user has the calendar open in other tab(s) for the affected date, those tabs automatically show the new session within 1 second without a full reload; other users' views are not auto-updated.
- Filters and search: Active filters (e.g., room, teacher, class, status) remain applied; the new session only appears if it matches.
- Scroll/zoom state: The calendar retains current scroll/zoom position and does not auto-scroll after creation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The day calendar MUST display a newly created regular class session within 1 second of successful creation, without requiring a manual page refresh or full page reload.
- **FR-002**: The session MUST appear in the correct date/time slot, reflecting the saved details (date, start/end time, teacher, room, class series, status).
- **FR-003**: The calendar MUST respect active filters; if the new session does not match, it MUST not appear. The system MUST show a generic success toast upon creation; it MUST NOT auto-adjust filters or display filter-specific messaging.
- **FR-004**: The calendar view state (current date, scroll position, zoom, selection) MUST be preserved during/after the creation flow and MUST NOT auto-scroll upon creation.
- **FR-005**: The UI MUST avoid duplicate/ghost tiles; a session appears exactly once after creation.
- **FR-006**: If creation fails, the calendar MUST not show the session and MUST present a clear error message; any temporary indicators MUST be removed.
- **FR-007**: If the session is created for a different date than currently displayed, the current view MUST remain unchanged; the session MUST be visible when navigating to its date.
- **FR-008**: Any secondary summaries linked to the day calendar (e.g., counts, side lists) MUST reflect the new session immediately and consistently with filters. [NEEDS CLARIFICATION: Which summaries are in scope?]
- **FR-009**: The behavior MUST be consistent whether the session is created from the day calendar flow or initiated from a class series popup (modal/drawer) on the same page.
- **FR-010**: The feature MUST not degrade perceived performance; the visible update should occur within 1 second on a typical connection and device. [NEEDS CLARIFICATION: Target performance baseline]
- **FR-011**: After a session is created, all open day calendar views in other tabs for the same authenticated user MUST reflect the new session within 1 second without a full page reload; cross-user propagation is out of scope.
- **FR-012**: The day calendar MUST use Asia/Tokyo as the fixed display time zone for session placement and display, matching existing project conventions.

### Key Entities _(include if feature involves data)_

- **Class Session**: A scheduled occurrence of a class with attributes such as id, class series reference, date, start time, end time, teacher, room, status.
- **Day Calendar View**: The calendar state for a specific date, including visible time range and UI state (scroll/zoom) and active filters (teacher, room, class series, status).
- **Class Series**: A series/template that can generate sessions across multiple dates; creation from this context can add new sessions on specific dates.

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
