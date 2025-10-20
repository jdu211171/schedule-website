# Quickstart for Custom Column Ordering

## Manual Testing Steps

1.  Navigate to the Teacher Table: Open the application and go to the page containing the teacher data table.
2.  Verify Default Order: Confirm that the columns are in their default order.
3.  Reorder Columns: Drag and drop a column to a new position. For example, move the "Email" column to the first position.
4.  Verify New Order: Confirm that the table updates and the "Email" column is now the first column.
5.  Refresh Page: Refresh the browser page.
6.  Verify Persistence: Confirm that the column order is preserved after the refresh.
7.  Navigate to Student Table: Go to the page containing the student data table.
8.  Verify Independent Order: Confirm that the column order of the student table is independent and has not been affected by the changes in the teacher table.
9.  Reorder Student Table: Reorder the columns in the student table.
10. Verify Student Table Persistence: Refresh the page and confirm that the new order of the student table is preserved.
11. Clear Local Storage: Open the browser's developer tools, go to the "Application" tab, and clear the localStorage.
12. Verify Revert to Default: Refresh the page and confirm that the column order for both tables has reverted to the default order.
