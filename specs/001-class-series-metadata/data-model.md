# Data Model: Class Series Metadata

## New Table: `class_series`

| Field                  | Type        | Modifiers                                                        | Description                                                               |
| ---------------------- | ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `seriesId`             | `String`    | `@id @map("series_id")`                                          | Unique identifier for the series.                                         |
| `branchId`             | `String?`   | `@map("branch_id")`                                              | The branch the series belongs to.                                         |
| `teacherId`            | `String?`   | `@map("teacher_id")`                                             | The default teacher for the series.                                       |
| `studentId`            | `String?`   | `@map("student_id")`                                             | The default student for the series.                                       |
| `subjectId`            | `String?`   | `@map("subject_id")`                                             | The default subject for the series.                                       |
| `classTypeId`          | `String?`   | `@map("class_type_id")`                                          | The default class type for the series.                                    |
| `boothId`              | `String?`   | `@map("booth_id")`                                               | The default booth for the series.                                         |
| `startDate`            | `DateTime`  | `@map("start_date") @db.Date`                                    | The start date of the series.                                             |
| `endDate`              | `DateTime?` | `@map("end_date") @db.Date`                                      | The end date of the series.                                               |
| `startTime`            | `DateTime`  | `@map("start_time") @db.Time(6)`                                 | The start time of the class sessions.                                     |
| `endTime`              | `DateTime`  | `@map("end_time") @db.Time(6)`                                   | The end time of the class sessions.                                       |
| `duration`             | `Int?`      |                                                                  | The duration of the class sessions in minutes.                            |
| `daysOfWeek`           | `Json`      | `@map("days_of_week")`                                           | The days of the week the class occurs on (e.g., `[1,3,5]`).               |
| `status`               | `String`    | `@default("ACTIVE")`                                             | The status of the series (e.g., `ACTIVE`, `PAUSED`, `ENDED`, `DISABLED`). |
| `generationMode`       | `String`    | `@default("ON_DEMAND") @map("generation_mode")`                  | The generation mode for the series (e.g., `ON_DEMAND`, `ADVANCE`).        |
| `lastGeneratedThrough` | `DateTime?` | `@map("last_generated_through") @db.Date`                        | The last date through which sessions have been generated.                 |
| `conflictPolicy`       | `Json?`     | `@map("conflict_policy")`                                        | The conflict policy for the series (e.g., `{ "skipConflicts": true }`).   |
| `notes`                | `String?`   | `@db.VarChar(255)`                                               | Notes about the series.                                                   |
| `createdAt`            | `DateTime`  | `@default(now()) @map("created_at") @db.Timestamp(6)`            | The creation timestamp of the series.                                     |
| `updatedAt`            | `DateTime`  | `@default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)` | The last update timestamp of the series.                                  |

### Prisma Schema

```prisma
model ClassSeries {
  seriesId              String   @id @map("series_id")
  // Default assignments
  branchId              String?  @map("branch_id")
  teacherId             String?  @map("teacher_id")
  studentId             String?  @map("student_id")
  subjectId             String?  @map("subject_id")
  classTypeId           String?  @map("class_type_id")
  boothId               String?  @map("booth_id")
  // Cadence & scope
  startDate             DateTime @map("start_date") @db.Date
  endDate               DateTime? @map("end_date") @db.Date
  startTime             DateTime @map("start_time") @db.Time(6)
  endTime               DateTime @map("end_time") @db.Time(6)
  duration              Int?     // minutes
  daysOfWeek            Json     @map("days_of_week") // [1,3,5] etc. Single series may cover multiple DOW
  // Lifecycle & automation
  status                String   @default("ACTIVE") // ACTIVE | PAUSED | ENDED | DISABLED
  generationMode        String   @default("ON_DEMAND") @map("generation_mode") // ON_DEMAND | ADVANCE
  lastGeneratedThrough  DateTime? @map("last_generated_through") @db.Date
  conflictPolicy        Json?    @map("conflict_policy") // e.g., { skipConflicts: true }
  notes                 String?  @db.VarChar(255)
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt             DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp(6)

  @@index([studentId])
  @@index([teacherId])
  @@index([branchId])
  @@index([classTypeId])
  @@index([status])
  @@map("class_series")
}
```

## Extended Table: `class_sessions`

### New Column

| Field    | Type     | Modifiers     | Description                                                  |
| -------- | -------- | ------------- | ------------------------------------------------------------ |
| `status` | `String` | `VARCHAR(20)` | The status of the session (e.g., `CONFIRMED`, `CONFLICTED`). |
