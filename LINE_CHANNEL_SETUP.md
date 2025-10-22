# LINE Channel Setup Guide

This guide explains how to set up and configure LINE channels for branch-specific notifications in the Schedule Website system.

## Prerequisites

1. LINE Developer Account (https://developers.line.biz/console/)
2. Admin access to the Schedule Website
3. Your production domain URL

## System Architecture

The system supports dual LINE channels per branch, enabling role-based notification routing for optimal communication management.

### Dual Channel Concept:

Each branch can be configured with up to **two LINE channels**:

1. **TEACHER Channel** - For staff and teacher communications:
   - Teacher schedule notifications
   - Administrative announcements
   - Staff-only information

2. **STUDENT Channel** - For student and parent communications:
   - Class reminders and homework notifications
   - Parent notifications (supports multiple LINE accounts per student)
   - General student communications

### Key Features:

- **Dual-channel support**: Each branch can have separate TEACHER and STUDENT channels
- **Smart routing**: Notifications automatically use the appropriate channel based on recipient type
- **Encrypted credentials**: All LINE tokens and secrets are encrypted in the database
- **Dynamic webhook URLs**: Each channel has its own unique webhook endpoint
- **Graceful fallback**: Uses available channel if specific type is not configured
- **Admin dashboard**: Visual overview of channel coverage per branch

## Initial Setup

### 1. Configure Environment Variables

Add the following to your `.env` file:

```bash
NEXTAUTH_URL=https://your-actual-domain.com  # CRITICAL: Replace with your actual domain!
```

**Important**: The `NEXTAUTH_URL` must be set to your actual production domain. The webhook URLs are generated based on this value.

### 2. Create a LINE Channel in LINE Developer Console

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create a new provider or select existing one
3. Create a new Messaging API channel
4. Note down:
   - Channel ID
   - Channel Secret (in Basic settings)
   - Channel Access Token (in Messaging API tab)

### 3. Register the Channel in Schedule Website

1. Log in as an Admin
2. Navigate to the LINE Channels management page (Dashboard → Settings → LINEチャンネル管理)
3. Click "Create Channel"
4. Enter:
   - Channel Name (descriptive name, e.g., "Main Campus - Teachers")
   - Description (optional)
   - Channel ID (from LINE Console)
   - Channel Secret
   - Channel Access Token
5. Assign the channel to one or more branches with channel types:
   - Select branches where this channel will be used
   - Choose channel type for each branch: **TEACHER** or **STUDENT**
   - Each branch can have both TEACHER and STUDENT channels (recommended)
6. Save the channel

### 4. Configure Webhook in LINE Developer Console

1. In the Schedule Website, find your newly created channel
2. Copy the generated webhook URL (format: `https://your-domain.com/api/line/webhook/{channelId}`)
3. Go back to LINE Developer Console
4. In the Messaging API tab:
   - Paste the webhook URL
   - Enable "Use webhook"
   - Disable "Auto-reply messages"
   - Disable "Greeting messages" (optional)
5. Click "Verify" to test the connection

## Webhook URL Verification

### Method 1: Browser Verification

Open the webhook URL in your browser. You should see:

- Channel information
- Active status
- Assigned branches
- Setup instructions

### Method 2: Admin Verification Endpoint

Use the verification endpoint to simulate LINE's webhook verification:

```bash
POST /api/admin/line-channels/{channelId}/verify
```

This will:

1. Generate a test payload
2. Sign it with the channel secret
3. Send it to the webhook endpoint
4. Return verification results

## Troubleshooting

### Webhook URL Returns 404

- **Cause**: `NEXTAUTH_URL` not set or incorrect
- **Solution**: Set `NEXTAUTH_URL` in `.env` to your actual domain

### Webhook Verification Fails

- **Cause**: Invalid credentials or signature mismatch
- **Solution**:
  1. Verify Channel Secret is correct
  2. Check if channel is active
  3. Use the admin verification endpoint to debug

### "Channel not found" Error

- **Cause**: Channel not registered in database
- **Solution**: Create the channel through admin interface first

### Cannot Connect to Webhook

- **Cause**: Server not accessible or wrong domain
- **Solution**:
  1. Verify `NEXTAUTH_URL` points to accessible domain
  2. Check server is running
  3. Verify no firewall blocking LINE's servers

## Testing

### 1. Test Channel Connection

Use the admin test endpoint:

```bash
POST /api/admin/line-channels/{channelId}/test
{
  "testUserId": "LINE_USER_ID"  // Optional: send test message to specific user
}
```

### 2. Test User Linking

1. Add the LINE Official Account as friend
2. Send `> username` or `/ username` to link account
3. System will confirm successful linking

### 3. Test Notifications

Create a test notification through the admin panel to verify delivery.

## Security Considerations

1. **Encrypted Storage**: All LINE credentials are encrypted using AES-256-GCM
2. **Webhook Signature**: All incoming webhooks are verified using HMAC-SHA256
3. **Access Control**: Only ADMIN users can manage LINE channels
4. **Branch Isolation**: Users only receive notifications from their assigned branches

## Best Practices

1. **Dual Channel Setup**: Configure both TEACHER and STUDENT channels for each branch:
   - **TEACHER Channel**: For staff communications, schedule changes, administrative announcements
   - **STUDENT Channel**: For student/parent notifications, class reminders, homework notifications
2. **Channel Naming Convention**: Use descriptive names that include location and type:
   - "Main Campus - Teachers"
   - "Main Campus - Students"
   - "Shibuya Branch - Teachers"
3. **Regular Testing**: Periodically test both channel types to ensure they're working correctly

4. **Credential Security**:
   - Update access tokens periodically for security
   - Never share channel credentials
   - Use the built-in encryption features

5. **Monitoring**:
   - Check the admin dashboard for channel coverage status
   - Monitor server logs for webhook errors or delivery issues
   - Use the branch channel overview to identify gaps in coverage

6. **Fallback Strategy**:
   - If only one channel type is configured, the system will gracefully fall back
   - However, dual channels provide better organization and user experience

## Common Commands

### Link User Account

Users send to LINE:

```
> username
```

or

```
/ username
```

### Unlink Account

Users send to LINE:

```
exit
```

or

```
quit
```

## API Reference

### Webhook Endpoint

- **URL**: `/api/line/webhook/{channelId}`
- **Methods**: GET (info), POST (webhook)

### Admin Endpoints

- **List Channels**: GET `/api/admin/line-channels`
- **Create Channel**: POST `/api/admin/line-channels`
- **Update Channel**: PATCH `/api/admin/line-channels/{channelId}`
- **Delete Channel**: DELETE `/api/admin/line-channels/{channelId}`
- **Test Channel**: POST `/api/admin/line-channels/{channelId}/test`
- **Verify Webhook**: POST `/api/admin/line-channels/{channelId}/verify`
