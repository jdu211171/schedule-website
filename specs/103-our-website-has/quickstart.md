# Quickstart for Responsive Layout and Zoom Fixes

This document provides instructions for testing the responsive layout and zoom fixes.

## Testing Scenarios

### 1. Small-Screen Laptop
- **Action**: Open the application in a browser with a viewport width of 1280px.
- **Expected Result**: The layout should adjust to the screen size without any horizontal scrolling.

### 2. Large-Screen Monitor
- **Action**: Open the application in a browser with a viewport width of 2560px.
- **Expected Result**: The content should utilize the available space and not be confined to a narrow column.

### 3. Browser Zoom
- **Action**: Set the browser zoom to 120% and open a data table or modal.
- **Expected Result**: The content should be fully visible and usable without being cut off.

### 4. Window Resizing
- **Action**: Resize the browser window from a wide to a narrow width.
- **Expected Result**: The layout components should reflow dynamically and gracefully.

## What Changed (Developer Notes)
- Global layout: `src/app/layout.tsx` now sets `min-h-dvh overflow-x-hidden` on `<body>`.
- Tables: `src/components/ui/table.tsx`
  - Container: `overflow-x-auto xl:overflow-visible`.
  - Header/Cell: `whitespace-normal sm:whitespace-nowrap`.
- Dialogs: `src/components/ui/dialog.tsx`
  - `DialogContent`: `max-h-[calc(100dvh-2rem)] overflow-y-auto` to fit viewport under zoom.
- Sheets: `src/components/ui/sheet.tsx`
  - `SheetContent`: `max-h-[calc(100dvh-2rem)] overflow-y-auto` for tall content.

## How To Verify Quickly
- Run `bun test specs/103-our-website-has/ui-responsiveness.test.tsx` — all 4 tests should pass.
- Manually check a few dialogs (e.g., student/teacher forms) at 120–150% zoom; confirm scroll works inside the modal and content is not clipped.
- On small screens (~1280px), confirm no horizontal scroll on main pages with large tables; at ≥1280px, table container should not force a scrollbar.
