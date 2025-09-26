# Data Model for Conflicting Class Session Resolution

## Class Session
- **Description**: Represents a single class instance.
- **Attributes**:
  - `classId`: String (PK)
  - `date`: Date
  - `startTime`: Time
  - `endTime`: Time
  - `teacherId`: String (FK to User)
  - `studentId`: String (FK to User)
  - `boothId`: String (FK to Booth)
  - `status`: String (e.g., 'CONFIRMED', 'CONFLICTED')
  - `is_cancelled`: Boolean

## Class Series
- **Description**: A collection of related Class Sessions.
- **Attributes**:
  - `seriesId`: String (PK)
  - ... (other attributes)
