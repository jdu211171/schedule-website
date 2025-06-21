# LINE Notification System Documentation

## Overview

This document describes the LINE notification system implementation for the Schedule Website. The system sends automatic reminders to teachers and students about upcoming class sessions.

## Components

### 1. API Endpoint (`/api/send-notifications`)

The main endpoint that processes and sends notifications. It supports both automated cron jobs and manual testing.

**Features:**
- Validates requests using a secret header (`x-cron-secret`)
- Supports test mode for development
- Provides detailed logging and error handling
- Returns comprehensive summary of operations

**Test Options:**
- `forceNotifications`: Ignores timing restrictions and sends notifications immediately
- `targetUserId`: Only process notifications for a specific user
- `targetSessionId`: Only process notifications for a specific session
- `notificationType`: Send only specific types (`ONE_DAY_BEFORE`, `THIRTY_MIN_BEFORE`, or `BOTH`)

### 2. LINE Notification Library (`/lib/line-notifications.ts`)

Core functionality for LINE messaging:
- Message formatting with JST timezone support
- LINE API integration with enhanced error handling
- Database tracking to prevent duplicate notifications
- Timing calculations for notification windows

### 3. Testing Script (`/scripts/test-notifications.ts`)

Command-line tool for testing notifications:

```bash
# Show available commands
npm run test:notifications help

# Send a test message to verify LINE integration
npm run test:notifications test-message <LINE_ID>

# List upcoming sessions
npm run test:notifications:list-sessions

# List users with LINE IDs
npm run test:notifications:list-users

# Send all eligible notifications (respects timing)
npm run test:notifications:send-all

# Force send all notifications (ignores timing)
npm run test:notifications:send-forced

# Send notifications for specific user
npm run test:notifications send-user <USER_ID>

# Send notifications for specific session
npm run test:notifications send-session <SESSION_ID>
```

## Notification Types

### 1. One Day Before
- Sent 23-25 hours before the class session
- Includes full session details
- Reminder to prepare for class

### 2. Thirty Minutes Before
- Sent 29-31 minutes before the class session
- Urgent reminder
- Brief session details

## Cron Job Configuration

The `vercel.json` file configures automatic notification checks:

```json
{
  "crons": [
    {
      "path": "/api/send-notifications",
      "schedule": "*/15 * * * *"  // Every 15 minutes
    }
  ]
}
```

## Environment Variables

Required environment variables:

```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token

# Security
CRON_SECRET=your_cron_secret

# Optional (for testing script)
NEXT_PUBLIC_URL=http://localhost:3000
```

## Database Schema

The system uses a `SentNotification` table to track sent notifications:

```prisma
model SentNotification {
  id             String   @id @default(uuid())
  classSessionId String
  userId         String
  type           String   // "ONE_DAY_BEFORE" or "THIRTY_MIN_BEFORE"
  sentAt         DateTime
  messageContent String
  success        Boolean
  errorMessage   String?
  
  @@unique([classSessionId, userId, type])
}
```

## Testing Workflow

1. **Verify LINE Integration:**
   ```bash
   npm run test:notifications test-message <YOUR_LINE_ID>
   ```

2. **Check Upcoming Sessions:**
   ```bash
   npm run test:notifications:list-sessions
   ```

3. **Test Specific Session:**
   ```bash
   npm run test:notifications send-session <SESSION_ID>
   ```

4. **Force Send All Notifications:**
   ```bash
   npm run test:notifications:send-forced
   ```

## API Testing

### GET Request (Development Only)
```bash
# View upcoming sessions and notification windows
curl http://localhost:3000/api/send-notifications

# Filter by user
curl http://localhost:3000/api/send-notifications?userId=USER_ID

# Filter by session
curl http://localhost:3000/api/send-notifications?sessionId=SESSION_ID
```

### POST Request (Manual Trigger)
```bash
# Send all eligible notifications
curl -X POST http://localhost:3000/api/send-notifications \
  -H "x-cron-secret: your-secret" \
  -H "Content-Type: application/json"

# Force send with test options
curl -X POST http://localhost:3000/api/send-notifications \
  -H "x-cron-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "forceNotifications": true,
    "targetUserId": "USER_ID",
    "notificationType": "ONE_DAY_BEFORE"
  }'
```

## Monitoring and Debugging

### Logs
The system provides detailed logs at each step:
- `[AUTH]` - Authentication checks
- `[SESSION]` - Session processing
- `[SEND]` - Notification sending
- `[SKIP]` - Skipped notifications
- `[LINE]` - LINE API interactions
- `[DB]` - Database operations
- `[TIMING]` - Timing calculations

### Common Issues

1. **"Unauthorized" Error:**
   - Check `CRON_SECRET` environment variable
   - In development, use `"test-secret"` as the header value

2. **No Notifications Sent:**
   - Check timing windows (use GET endpoint to see windows)
   - Verify users have LINE IDs configured
   - Use `forceNotifications: true` to bypass timing checks

3. **LINE API Errors:**
   - 400: Invalid LINE ID or message format
   - 401: Invalid `LINE_CHANNEL_ACCESS_TOKEN`
   - 429: Rate limit exceeded

## Security Considerations

1. The `CRON_SECRET` should be a strong, random string
2. GET endpoint is disabled in production
3. Test options are logged for audit trails
4. LINE IDs are partially masked in logs for privacy

## Performance

- Notification checks run every 15 minutes
- Each API call has a 60-second maximum duration
- LINE API calls have a 10-second timeout
- Database queries are optimized with proper indexes