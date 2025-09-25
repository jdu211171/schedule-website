# Research / Notes

- The endDate UI lives in `src/components/class-series/class-series-table.tsx` as `InlineEndDateCell`.
- Original behavior: `onSelect` immediately called update.mutateAsync; header X cleared the value.
- Pattern reference: `src/components/fix-date-range-picker/simple-date-range-picker.tsx` uses temp state with Apply/Cancel/Clear.
- Adopted similar approach for single date: draft state + explicit actions.

## Assumptions
- Users expect clicking a date not to persist without confirmation.
- The X in the popover header should act as close, not clear.

