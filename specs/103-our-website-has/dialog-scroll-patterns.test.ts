import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const filesToCheck = [
  'src/components/teacher/teacher-form-dialog.tsx',
  'src/components/student/student-form-dialog.tsx',
  'src/components/admin-user/admin-user-form-dialog.tsx',
  'src/components/ui/csv-import-dialog.tsx',
  'src/components/class-series/series-sessions-table-dialog.tsx',
];

describe('Dialog scroll patterns under zoom (Spec 103)', () => {
  for (const rel of filesToCheck) {
    it(`ensures ${rel} either uses base overflow-y-auto or provides an internal scroll area`, () => {
      const file = path.join(process.cwd(), rel);
      const content = fs.readFileSync(file, 'utf8');
      const overridesHidden = /<DialogContent[^>]*className=["'][^"']*overflow-hidden/i.test(content);
      if (overridesHidden) {
        // When outer overflow is hidden, ensure an internal scroll area exists
        expect(content).toMatch(/flex-1\s+overflow-(auto|y-auto)/);
        // Also expect a max height cap on the dialog
        expect(content).toMatch(/max-h-\[/);
      } else {
        // If not hiding overflow, ensure we are not forcing overflow-x on the dialog
        expect(content).not.toMatch(/overflow-x-auto/);
      }
    });
  }
});

