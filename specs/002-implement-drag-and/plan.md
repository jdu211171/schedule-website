# Plan: Drag & Drop + Overlap Lanes Merge

- Compute per-booth lanes (interval partitioning) and dynamic row heights.
- Update grid cells to full row height; keep time header fixed.
- Wrap grid in `DndContext` with sensors; make cells droppable by `cell-{boothIndex}-{timeIndex}`.
- Render conflict gutter bands (z=9), drag ghost overlay sized to booth row (z=10), and lesson cards (z=11).
- Make `LessonCard` draggable; position by `rowTopOffset + laneIndex * laneHeight`; keep width from duration.
- On drop: compute new start/end and booth; update a single session or prompt for series scope.
- Validate with `bun run check-errors` and manual overlap/drag scenarios.

