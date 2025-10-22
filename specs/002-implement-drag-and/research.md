# Notes / Decisions

- Droppables use `cell-{boothIndex}-{timeIndex}` to reuse existing DnD logic.
- Ghost overlay height uses the booth row height (sum of lanes), not a single lane; lane is computed after drop.
- Conflict gutter (z=9) sits under ghost (z=10) and cards (z=11) to keep guidance readable.
- Lesson cards show non-color conflict signals (badge + hatch) to satisfy a11y.
- Memoization keys updated to include lane props to prevent jitter while dragging.
  \n+## Perf findings (ghost overlay)

- Using `ring-2` + `ring-inset` and inset `shadow` on a large, moving ghost caused frequent repaints and jank during drag.
- Switching to a simple `border-2` and positioning via `transform: translate3d(...)` with `will-change: transform` improved smoothness.
- Added a guard in `onDragOver` to skip `setGhost` when indices are unchanged, reducing re-renders.
