# Import Schemas

This directory contains Zod schemas for validating CSV import data for various entities in the schedule website.

## Available Schemas

### 1. Branch Import (`branch-import.schema.ts`)

- **Fields**: name (required), notes, order
- **Usage**: For importing branch/location data

### 2. Admin Import (`admin-import.schema.ts`)

- **Fields**: username, email, password, name, isRestrictedAdmin, branchNames
- **Features**:
  - Password validation (min 8 chars)
  - Username format validation
  - Multiple branch assignment via comma-separated values
  - Boolean conversion for isRestrictedAdmin

### 3. Staff Import (`staff-import.schema.ts`)

- **Fields**: username, email, password, name, branchNames
- **Similar to Admin but without isRestrictedAdmin field**

### 4. Subject Import (`subject-import.schema.ts`)

- **Fields**: name (required), notes
- **Usage**: For importing global subject data

### 5. Subject Type Import (`subject-type-import.schema.ts`)

- **Fields**: name (required), notes, order
- **Usage**: For categorizing subjects

### 6. Student Type Import (`student-type-import.schema.ts`)

- **Fields**: name (required), maxYears, description, order
- **Features**: Validates maxYears (1-10)

### 7. Booth Import (`booth-import.schema.ts`)

- **Fields**: name, status, branchName, order
- **Features**:
  - Boolean conversion for status field
  - Branch association via branchName

### 8. Class Type Import (`class-type-import.schema.ts`)

- **Fields**: name, notes, parentName, order
- **Features**: Supports hierarchical structure via parentName

### 9. Holiday Import (`holiday-import.schema.ts`)

- **Fields**: name, startDate, endDate, isRecurring, description
- **Features**:
  - Multiple date format support (YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, MM-DD-YYYY)
  - Date range validation
  - Boolean conversion for isRecurring

## Common Features

1. **Japanese Error Messages**: All validation errors are in Japanese
2. **Empty String Handling**: Empty strings are converted to null where appropriate
3. **Number Conversion**: String numbers are automatically parsed
4. **Boolean Conversion**: Accepts multiple formats:
   - English: true/false, yes/no, 1/0
   - Japanese: はい/いいえ, 有効/無効, 毎年 (for recurring)

## Usage Example

```typescript
import { branchImportSchema, BRANCH_CSV_HEADERS } from "@/schemas/import";
import { CSVParser } from "@/lib/csv-parser";

// Parse CSV file
const result = await CSVParser.parseFile(file);

// Validate each row
const validatedData = [];
const errors = [];

result.data.forEach((row, index) => {
  try {
    const validated = branchImportSchema.parse(row);
    validatedData.push(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push({
        row: index + 2, // +1 for header, +1 for 1-based indexing
        errors: error.errors.map((e) => e.message),
      });
    }
  }
});
```

## CSV Headers

Each schema exports a constant array of expected CSV headers:

- `BRANCH_CSV_HEADERS`
- `ADMIN_CSV_HEADERS`
- `STAFF_CSV_HEADERS`
- etc.

These can be used to validate CSV structure and generate template files.
