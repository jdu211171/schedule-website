# Multi-Channel LINE Notifications Implementation

This document describes the multi-channel LINE notifications backend that supports:
- Multiple LINE channels per learning center
- Branch-specific or shared channel configurations
- Secure credential management with encryption
- Backward compatibility with existing setup

## Architecture Overview

### Database Schema

1. **LineChannel** - Stores LINE channel configurations
   - `channelId` - Unique identifier
   - `name` - Channel display name
   - `channelAccessToken` - Encrypted access token
   - `channelSecret` - Encrypted channel secret
   - `webhookUrl` - Channel-specific webhook URL
   - `isActive` - Whether channel is active
   - `isDefault` - Default channel flag
   - `lastRotatedAt` - Credential rotation tracking

2. **BranchLineChannel** - Junction table for branch-channel mapping
   - `branchId` - Reference to Branch
   - `channelId` - Reference to LineChannel
   - `isPrimary` - Primary channel flag for branch

### Key Components

#### 1. Encryption Service (`/lib/encryption.ts`)
- AES-256-GCM encryption for credentials
- Uses `ENCRYPTION_KEY` or falls back to `NEXTAUTH_SECRET`
- Secure storage of sensitive LINE credentials

#### 2. Multi-Channel LINE Library (`/lib/line-multi-channel.ts`)
- Channel credential management
- Branch-specific channel resolution
- Test channel functionality
- Backward compatibility with env variables

#### 3. Channel Management Service (`/services/line-channel.service.ts`)
- CRUD operations for channels
- Branch assignment management
- Credential validation before saving
- Migration from environment variables

#### 4. API Endpoints

**Channel Management:**
- `GET /api/admin/line-channels` - List all channels
- `POST /api/admin/line-channels` - Create new channel
- `GET /api/admin/line-channels/[channelId]` - Get channel details
- `PATCH /api/admin/line-channels/[channelId]` - Update channel
- `DELETE /api/admin/line-channels/[channelId]` - Delete channel

**Channel Operations:**
- `POST /api/admin/line-channels/[channelId]/test` - Test channel
- `PUT /api/admin/line-channels/[channelId]/branches` - Assign branches
- `POST /api/admin/line-channels/migrate` - Migrate from env vars

**Webhooks:**
- `/api/line/webhook/[channelId]` - Channel-specific webhook endpoint

## Setup Guide

### 1. Environment Variables

Add encryption key (optional - will use NEXTAUTH_SECRET if not set):
```env
ENCRYPTION_KEY=your-32-char-secret-key
```

### 2. Initial Migration

If you have existing LINE credentials in environment variables:

```bash
curl -X POST http://localhost:3000/api/admin/line-channels/migrate \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

This will create a default channel from your existing credentials.

### 3. Create New Channel

```bash
curl -X POST http://localhost:3000/api/admin/line-channels \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Campus Channel",
    "description": "LINE channel for main campus",
    "channelAccessToken": "YOUR_CHANNEL_ACCESS_TOKEN",
    "channelSecret": "YOUR_CHANNEL_SECRET",
    "branchIds": ["branch-id-1", "branch-id-2"]
  }'
```

### 4. Configure LINE Webhook

For each channel, set the webhook URL in LINE Developers Console:
```
https://your-domain.com/api/line/webhook/[channelId]
```

## Usage Examples

### Sending Notifications

The notification system automatically selects the appropriate channel:

```typescript
// In notification send API
const credentials = await getChannelCredentials(branchId);
await sendLineMulticast(lineIds, message, credentials);
```

### Testing a Channel

```bash
curl -X POST http://localhost:3000/api/admin/line-channels/[channelId]/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testUserId": "LINE_USER_ID"
  }'
```

## Security Considerations

1. **Credential Encryption**: All LINE credentials are encrypted at rest
2. **Access Control**: Admin-only access to channel management
3. **Webhook Verification**: Signature validation for all webhooks
4. **Audit Trail**: Track credential rotations via `lastRotatedAt`

## Migration Strategy

1. **Phase 1**: Deploy with backward compatibility
   - Existing env-based setup continues working
   - New multi-channel system available

2. **Phase 2**: Gradual migration
   - Import existing credentials to default channel
   - Configure branch-specific channels as needed

3. **Phase 3**: Full migration
   - All branches using channel-based configuration
   - Remove env variables (optional)

## Best Practices

1. **Channel Organization**:
   - One channel per physical location
   - Shared channels for small branches
   - Separate test/production channels

2. **Credential Rotation**:
   - Regular rotation schedule
   - Use `lastRotatedAt` to track
   - Test after rotation

3. **Monitoring**:
   - Track webhook failures per channel
   - Monitor notification delivery rates
   - Set up alerts for channel issues

## Troubleshooting

### Channel Not Sending Messages
1. Test channel credentials using test endpoint
2. Verify webhook URL is correctly configured
3. Check channel is active and assigned to branch

### Webhook Not Receiving Messages
1. Verify webhook URL in LINE Developers Console
2. Check signature validation
3. Ensure channel is active

### Migration Issues
1. Verify env variables are set correctly
2. Check for existing default channel
3. Review migration endpoint response