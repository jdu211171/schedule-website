# LINE Notification System - Quick Start Guide

## Prerequisites

1. LINE Developer Account and Bot Channel
2. Database with user LINE IDs configured
3. Environment variables set up

## Setup Steps

### 1. Install Dependencies

```bash
yarn install
# or
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:
- `LINE_CHANNEL_ACCESS_TOKEN` - From LINE Developer Console
- `CRON_SECRET` - A secure random string

### 3. Test LINE Integration

Send a test message to verify your LINE bot is working:

```bash
npm run test:notifications test-message YOUR_LINE_USER_ID
```

### 4. Check Database Setup

List users with LINE IDs:

```bash
npm run test:notifications:list-users
```

List upcoming sessions:

```bash
npm run test:notifications:list-sessions
```

### 5. Test Notifications

#### Option A: Test Specific Session
```bash
npm run test:notifications send-session SESSION_ID
```

#### Option B: Force Send All (Testing)
```bash
npm run test:notifications:send-forced
```

#### Option C: Normal Operation (Respects Timing)
```bash
npm run test:notifications:send-all
```

### 6. Deploy to Vercel

The `vercel.json` file is already configured to run notifications every 15 minutes.

Set the `CRON_SECRET` environment variable in Vercel:
```bash
vercel env add CRON_SECRET
```

## Monitoring

### Check API Status (Development)

```bash
# View upcoming sessions and notification windows
curl http://localhost:3000/api/send-notifications

# Check specific user
curl http://localhost:3000/api/send-notifications?userId=USER_ID
```

### View Logs

In Vercel dashboard, check Function logs for `/api/send-notifications`

## Common Commands

```bash
# Help
npm run test:notifications help

# List all users with LINE IDs
npm run test:notifications:list-users

# List upcoming sessions
npm run test:notifications:list-sessions

# Send test notification to specific user
npm run test:notifications send-user USER_ID

# Force send all notifications (ignore timing)
npm run test:notifications:send-forced
```

## Troubleshooting

1. **No notifications sent?**
   - Check notification windows with GET endpoint
   - Verify LINE IDs are configured
   - Use `send-forced` to bypass timing

2. **LINE API errors?**
   - Verify `LINE_CHANNEL_ACCESS_TOKEN`
   - Check LINE Developer Console for issues
   - Test with `test-message` command

3. **Cron not running?**
   - Check Vercel Function logs
   - Verify `CRON_SECRET` matches in Vercel