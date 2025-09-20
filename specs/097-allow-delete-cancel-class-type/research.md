# Research & Notes

- Code search showed the delete guard blocks root types named "通常授業", "特別授業", and "キャンセル" (src/app/api/class-types/[classTypeId]/route.ts).
- Seed notes confirm a dedicated "キャンセル" class type was removed earlier; cancellations use `ClassSession.isCancelled`.
- Decision: remove "キャンセル" from protected list. Keep only "通常授業" and "特別授業" protected.

Assumptions
- User confirmed no `class_sessions` rows reference the "キャンセル" class type.
- No child class types under "キャンセル" (if present, API still blocks deletion until children are removed).

Follow-ups
- If deletion fails with FK constraint, check for references across all branches using psql and clear/nullify as needed.
