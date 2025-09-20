import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Responsive Layout & Zoom (Spec 103)', () => {
  it('T003: small-screen (1280px) – tables allow horizontal scroll only below xl and not at ≥1280px', () => {
    const file = path.join(process.cwd(), 'src/components/ui/table.tsx');
    const content = fs.readFileSync(file, 'utf8');
    // Expect base to be overflow-x-auto, but from xl (≥1280px) overflow should be visible (no scrollbar)
    expect(content).toContain('data-slot="table-container"');
    expect(content).toContain('overflow-x-auto');
    expect(content).toContain('xl:overflow-visible');
  });

  it('T004: large-screen (2560px) – tables wrap content on small screens, keep nowrap from sm: and up', () => {
    const file = path.join(process.cwd(), 'src/components/ui/table.tsx');
    const content = fs.readFileSync(file, 'utf8');
    // On base (mobile) we expect wrapping; from sm: we allow nowrap
    expect(content).toContain('data-slot="table-head"');
    expect(content).toContain('whitespace-normal');
    expect(content).toContain('sm:whitespace-nowrap');
    expect(content).toContain('data-slot="table-cell"');
    expect(content).toContain('whitespace-normal');
    expect(content).toContain('sm:whitespace-nowrap');
  });

  it('T005: zoom (120%) – dialog content fits viewport by capping height and enabling vertical scroll', () => {
    const file = path.join(process.cwd(), 'src/components/ui/dialog.tsx');
    const content = fs.readFileSync(file, 'utf8');
    expect(content).toContain('data-slot="dialog-content"');
    expect(content).toContain('max-h-[calc(100dvh-2rem)]');
    expect(content).toContain('overflow-y-auto');
  });

  it('T006: window resizing – sheet content supports vertical overflow and viewport height cap', () => {
    const file = path.join(process.cwd(), 'src/components/ui/sheet.tsx');
    const content = fs.readFileSync(file, 'utf8');
    expect(content).toContain('data-slot="sheet-content"');
    expect(content).toContain('overflow-y-auto');
    expect(content).toContain('max-h-[calc(100dvh-2rem)]');
  });
});
