# Allow deleting "キャンセル" class type

## Problem
- Attempting to delete a root class type named "キャンセル" returns: 「この基本クラスタイプは削除できません」.
- We no longer preserve a dedicated "キャンセル" class type; cancellations rely on `isCancelled` on class_sessions.

## Goal
- Remove "キャンセル" from the protected root class types so it can be edited/removed like a normal type.

## Acceptance Criteria
- DELETE /api/class-types/:id for a root "キャンセル" type no longer returns 403 due to protection.
- PATCH restrictions for protected types no longer apply to "キャンセル".
- TypeScript check passes.

