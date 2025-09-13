# Feature Specification: Class Series Metadata

**Feature Branch**: `001-class-series-metadata`  
**Created**: 2025-09-10  
**Status**: Draft  
**Input**: User description: "Introduce explicit “series metadata” (a blueprint) for regular commuting classes, leveraging what already exists in the codebase. It focuses on low-risk changes that unlock per-student commuting summaries, easier series-level edits, and safer bulk generation."

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors (Staff, Student, Teacher), actions (create, view, edit, extend, summarize), data (Class Series, Class Session), constraints (regular vs. special classes)
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

As a Staff member, I want to define a recurring class as a single "series blueprint" so that I can easily manage its schedule, track student attendance, and make bulk updates without having to edit individual classes.

### Acceptance Scenarios

1. **Given** a student is enrolled in a regular weekly Math class, **When** a Staff member views the student's profile, **Then** they should see a summary card showing "Total Commuting Classes: X (next 90 days)" and a breakdown by subject (e.g., "Math: Y").
2. **Given** a class series for a weekly English class exists, **When** the assigned teacher resigns, **Then** a Staff member can update the series blueprint with a new teacher, and all future, un-cancelled class sessions for that series are updated accordingly.
3. **Given** a class series is set to "On-Demand" generation, **When** a Staff member needs to schedule the next month of classes, **Then** they can use an "extend" function to generate all sessions for the next month, which are automatically marked as 'CONFIRMED'.
4. **Given** a class series is set to "Advance" generation, **When** the system's scheduled script runs, **Then** it automatically generates sessions for the next 30-60 days, marking any with scheduling conflicts as 'CONFLICTED' for staff review.

### Edge Cases

- What happens when a staff member tries to create a series blueprint for a "special" class type (e.g., `特別授業`)? The system should prevent this.
- How does the system handle updates to a series blueprint that conflict with manual changes made to individual future sessions? [NEEDS CLARIFICATION: Does the series update overwrite individual changes, or are they preserved? The document mentions a "drift detector" for later, but what is the v0 behavior?]
- What happens if a series `end_date` is in the past? The system should not generate any new sessions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a mechanism to create, read, update, and view "Class Series" blueprints for regular (non-special) recurring classes.
- **FR-002**: A Class Series blueprint MUST store default assignments (teacher, student, subject, etc.), cadence (start/end dates, times, days of week), and generation rules.
- **FR-003**: The system MUST provide a summary view for each student showing their total scheduled regular classes and a count per subject for a future time window (e.g., 90 days).
- **FR-004**: Staff (Admin/Staff roles) MUST be able to update a Class Series blueprint, and the changes (e.g., new teacher) MUST be propagated to all future, non-cancelled class sessions belonging to that series.
- **FR-005**: The system MUST support two modes for generating class sessions from a blueprint:
  - **On-Demand**: Staff can manually trigger the generation of sessions for a specified number of months.
  - **Advance**: A scheduled process automatically generates sessions up to a defined future date.
- **FR-006**: The system MUST flag individual class sessions that cannot be generated due to conflicts (e.g., teacher unavailability, overlaps) with a 'CONFLICTED' status for manual review.
- **FR-007**: Individual class sessions generated without issues MUST have a 'CONFIRMED' status.
- **FR-008**: The system MUST NOT create Class Series blueprints for class types designated as "special" (`特別授業`).
- **FR-009**: The system MUST provide a way to backfill Class Series blueprints from existing recurring `class_sessions` in the database.
- **FR-010**: The system MUST ensure that when class sessions are archived, their `series_id` is preserved in the `archives` table.

### Key Entities _(include if feature involves data)_

- **Class Series (Blueprint)**: Represents the template for a recurring, regular class. It contains the default properties of the class, such as the student, teacher, subject, room (booth), time, and recurrence pattern (days of the week). It also defines the generation strategy and lifecycle status.
- **Class Session**: Represents a single, concrete instance of a class on a specific date. It is linked to a Class Series blueprint and has a status to indicate if it's confirmed or has a scheduling conflict.

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
