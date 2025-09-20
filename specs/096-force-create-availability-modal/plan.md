Plan

1) Locate availability prompt and creation flows
2) Redesign modal to 強制作成/キャンセル
3) Map 強制作成 to skip availability errors
4) Validate single and series flows
5) Ship and note follow-ups

Notes
- For single-session, use checkAvailability=false when forcing to bypass soft errors.
- For series, filter availability conflicts from preview; extend immediately if only soft errors remain.
- Hard conflicts (overlaps) continue to surface.

