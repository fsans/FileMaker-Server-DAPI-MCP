# Token Lifecycle Management

## Overview

The FileMaker Data API MCP Server now includes comprehensive token lifecycle management with:
- **Token Caching** - Persistent token storage across sessions
- **Automatic Refresh** - Tokens refreshed before expiration
- **Error Recovery** - Automatic retry with re-authentication on 401 errors
- **Expiration Tracking** - Automatic cleanup of expired tokens

## Architecture

### TokenManager Class (`src/token-manager.ts`)

The `TokenManager` handles all token lifecycle operations:

```typescript
interface CachedToken {
  token: string;
  server: string;
  database: string;
  user: string;
  expiresAt: number;        // Unix timestamp in milliseconds
  createdAt: number;
  refreshCount: number;
}
```

### Key Features

#### 1. Token Caching
- **Persistent Storage**: Tokens stored in `~/.filemaker-mcp/tokens.json`
- **File Permissions**: Restricted to 0o600 (owner read/write only)
- **Automatic Cleanup**: Expired tokens removed on load and periodically

```typescript
// Cache a token
tokenManager.cacheToken(token, server, database, user, ttlMs);

// Retrieve cached token
const token = tokenManager.getToken(server, database, user);
```

#### 2. Automatic Refresh
- **Expiry Buffer**: Tokens refreshed 5 minutes before expiration
- **Refresh Detection**: `needsRefresh()` checks if token needs renewal
- **Refresh Tracking**: Maintains count of refreshes per token

```typescript
// Check if token needs refresh
if (tokenManager.needsRefresh(server, database, user)) {
  // Trigger re-authentication
}

// Refresh token expiry
tokenManager.refreshToken(server, database, user, newTtlMs);
```

#### 3. Error Recovery
- **401 Handling**: Automatic retry on 401 Unauthorized
- **Token Invalidation**: Failed tokens immediately invalidated
- **Re-authentication**: Automatic login on token expiration
- **Retry Limit**: Maximum 2 retry attempts to prevent infinite loops

```typescript
// Automatic 401 retry with token refresh
private async makeRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  retryCount: number = 0
): Promise<T>
```

#### 4. Token Invalidation
- **Logout**: Token invalidated on explicit logout
- **Error**: Token invalidated on 401 error
- **Expiration**: Expired tokens automatically removed

```typescript
// Invalidate a token
tokenManager.invalidateToken(server, database, user);
```

## Token Lifecycle Flow

### Initial Login
```
1. Check cache for valid token
   ├─ Found & Valid → Use cached token
   └─ Not Found or Expired → Proceed to login
2. Authenticate with FileMaker Server
3. Receive token from server
4. Cache token with 15-minute TTL
5. Store in ~/.filemaker-mcp/tokens.json
```

### Subsequent Requests
```
1. Check if token exists and is valid
2. Make API request with token
3. If 401 error:
   ├─ Invalidate current token
   ├─ Re-authenticate (login)
   ├─ Retry original request
   └─ Return result or error
4. Otherwise return response
```

### Token Expiration
```
1. Token reaches 5-minute buffer before expiry
2. Next request triggers automatic refresh
3. New token obtained via login
4. Old token invalidated
5. New token cached with fresh TTL
```

### Logout
```
1. Send DELETE request to FileMaker API
2. Invalidate cached token
3. Clear in-memory token
4. Remove from persistent storage
```

## Configuration

### Default Settings
- **Token TTL**: 15 minutes (900,000 ms)
- **Expiry Buffer**: 5 minutes (300,000 ms)
- **Max Retries**: 2 attempts
- **Storage**: `~/.filemaker-mcp/tokens.json`
- **Permissions**: 0o600 (owner only)

### Customization
Modify constants in `src/token-manager.ts`:

```typescript
private readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;  // Refresh 5 min before expiry
private readonly DEFAULT_TOKEN_TTL = 15 * 60 * 1000;   // 15 minute default TTL
```

And in `src/index.ts`:

```typescript
private readonly MAX_RETRY_ATTEMPTS = 2;  // Max 401 retry attempts
```

## API Methods

### TokenManager Methods

#### `cacheToken(token, server, database, user, ttlMs)`
Cache a new token with specified TTL.

#### `getToken(server, database, user): string | null`
Get a cached token if valid, returns null if expired or not found.

#### `needsRefresh(server, database, user): boolean`
Check if a token needs refresh (within buffer window).

#### `refreshToken(server, database, user, ttlMs)`
Update token expiry time and increment refresh count.

#### `invalidateToken(server, database, user)`
Immediately invalidate a token.

#### `getTokenInfo(server, database, user): TokenInfo | null`
Get token metadata for debugging (password masked).

#### `getStats(): { totalCached, validTokens, expiredTokens }`
Get token cache statistics.

#### `clearAll()`
Clear all cached tokens.

## Security Considerations

### File Permissions
- Tokens stored with 0o600 permissions (owner read/write only)
- Automatically enforced on every save

### Token Masking
- Passwords never logged or displayed
- Token info API masks sensitive data

### Automatic Cleanup
- Expired tokens removed on startup
- Expired tokens removed on access attempt
- Failed tokens immediately invalidated

### No Token Sharing
- Tokens are per-user, per-database, per-server
- Separate cache entries for different credentials

## Monitoring & Debugging

### Get Token Info
```typescript
const info = tokenManager.getTokenInfo(server, database, user);
// Returns: { server, database, user, createdAt, expiresAt, expiresIn, refreshCount }
```

### Get Cache Statistics
```typescript
const stats = tokenManager.getStats();
// Returns: { totalCached, validTokens, expiredTokens }
```

### View Tokens File
```bash
cat ~/.filemaker-mcp/tokens.json
```

### Clear Cache
```bash
rm ~/.filemaker-mcp/tokens.json
```

## Error Handling

### 401 Unauthorized
- **Cause**: Token expired or invalid
- **Action**: Automatic re-authentication and retry
- **Max Attempts**: 2 (prevents infinite loops)
- **Logging**: Detailed logs of retry attempts

### Token Not Found
- **Cause**: No cached token for credentials
- **Action**: Proceed with new authentication
- **Result**: New token obtained and cached

### Login Failure
- **Cause**: Invalid credentials or server unavailable
- **Action**: Error propagated to caller
- **Recovery**: User must retry with valid credentials

## Performance Impact

### Benefits
- **Reduced Logins**: Cached tokens eliminate redundant authentication
- **Faster Requests**: No login overhead for cached tokens
- **Automatic Recovery**: 401 errors handled transparently
- **Session Persistence**: Tokens survive server restarts

### Overhead
- **File I/O**: Token save on cache/invalidate (~1-2ms)
- **Memory**: ~1KB per cached token
- **Cleanup**: Periodic cleanup of expired tokens

## Future Enhancements

Potential improvements:
- Token rotation policy (refresh every N uses)
- Connection pooling with token reuse
- Token encryption at rest
- Token usage analytics
- Configurable TTL per connection
- Token validation endpoint
- Concurrent token management
- Token revocation list

## Testing

### Unit Tests Needed
- Token caching and retrieval
- Expiration detection
- Refresh logic
- Invalidation
- File persistence
- Cleanup operations

### Integration Tests Needed
- Login with token caching
- Cached token reuse
- Token refresh on expiry
- 401 error recovery
- Logout invalidation
- Multi-connection token management

### Manual Testing
```bash
# Clear token cache
rm ~/.filemaker-mcp/tokens.json

# Start server
filemaker-mcp start

# First login (creates cache)
# Second login (uses cache)
# Verify tokens.json created

# Check token info
cat ~/.filemaker-mcp/tokens.json
```

## Troubleshooting

### Tokens Not Cached
- Check file permissions: `ls -la ~/.filemaker-mcp/tokens.json`
- Verify directory exists: `ls -la ~/.filemaker-mcp/`
- Check logs for errors

### 401 Errors Not Retrying
- Verify `MAX_RETRY_ATTEMPTS` is > 0
- Check logs for retry attempts
- Verify credentials are correct

### Expired Tokens Not Cleaned
- Restart server to trigger cleanup
- Manually delete tokens file
- Check logs for cleanup operations

### Performance Issues
- Monitor token file size
- Check number of cached tokens: `getStats()`
- Consider reducing TTL if tokens accumulate
