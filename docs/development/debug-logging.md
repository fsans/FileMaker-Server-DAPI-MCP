# Debug Logging Guide

The FileMaker Data API MCP Server includes comprehensive debug logging using the `debug` package. This allows you to troubleshoot issues and monitor server operations in detail.

## Enabling Debug Logging

Debug logging is controlled by the `DEBUG` environment variable. Set it before starting the server:

### Enable All Logs

```bash
DEBUG=fmda:* npm run dev
```

### Enable Specific Namespaces

```bash
# Client API operations only
DEBUG=fmda:client npm run dev

# Multiple namespaces
DEBUG=fmda:client,fmda:tools npm run dev

# Everything except verbose details
DEBUG=fmda:*,-fmda:verbose:* npm run dev
```

### With CLI

```bash
DEBUG=fmda:* filemaker-mcp start
```

### With Claude Desktop

Add the `DEBUG` environment variable to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "filemaker": {
      "command": "node",
      "args": ["/path/to/filemaker-data-api-mcp/dist/index.js"],
      "env": {
        "FM_SERVER": "your.server.com",
        "FM_DATABASE": "YourDatabase",
        "FM_USER": "username",
        "FM_PASSWORD": "password",
        "DEBUG": "fmda:*"
      }
    }
  }
}
```

## Available Logging Namespaces

### Core Namespaces

| Namespace | Description | Use Case |
|-----------|-------------|----------|
| `fmda:client` | FileMaker API client operations | API calls, authentication, CRUD operations |
| `fmda:tools` | Tool handler execution | Tool invocations and completions |
| `fmda:config` | Configuration management | Config loading, validation, saving |
| `fmda:connection` | Connection management | Connection switching, adding, listing |
| `fmda:transport` | Transport layer | Server startup, HTTP/HTTPS/stdio |
| `fmda:cli` | CLI commands | Setup wizard, start command, config commands |

### Verbose Namespaces

| Namespace | Description | Use Case |
|-----------|-------------|----------|
| `fmda:verbose:client` | Detailed API request/response data | Full JSON payloads, debugging API issues |
| `fmda:verbose:tools` | Detailed tool arguments and results | Tool parameter debugging |

## Common Debugging Scenarios

### Debugging Authentication Issues

```bash
DEBUG=fmda:client npm run dev
```

Look for:
- `Logging in to database: YourDatabase as user: username`
- `Login successful, token acquired`
- Error messages with status codes and response data

### Debugging Tool Execution

```bash
DEBUG=fmda:tools npm run dev
```

Look for:
- `Tool called: fm_create_record`
- `Tool arguments: {...}`
- `Tool fm_create_record completed in 245ms`

### Debugging Connection Issues

```bash
DEBUG=fmda:connection npm run dev
```

Look for:
- `Initializing ConnectionManager`
- `Loaded 3 connection(s)`
- `Switched to connection: production (MyDB@server.com)`

### Debugging API Requests and Responses

```bash
DEBUG=fmda:client,fmda:verbose:client npm run dev
```

This shows:
- All API operations (`fmda:client`)
- Full request/response payloads (`fmda:verbose:client`)

### Full Debugging Mode

```bash
DEBUG=fmda:*,fmda:verbose:* npm run dev
```

**Warning:** This generates a LOT of output. Use only when necessary.

## Log Output Format

Debug logs are formatted as:

```
fmda:client Logging in to database: TestDB as user: admin +0ms
fmda:client POST https://server.com/fmi/data/vLatest/databases/TestDB/sessions +2ms
fmda:client Login successful, token acquired +245ms
fmda:client login completed in 247ms +1ms
```

- Namespace: `fmda:client`
- Message: `Logging in to database: TestDB as user: admin`
- Timing: `+0ms` (milliseconds since last log)

## Performance Timing

The logger automatically tracks performance for key operations:

- API calls (login, logout, CRUD operations)
- Tool executions
- Find operations with result counts

Example:
```
fmda:client Finding records in layout: Contacts with 2 criteria +0ms
fmda:client Found 15 record(s) +523ms
fmda:client findRecords completed in 523ms +1ms
```

## Error Logging

Errors are logged with full context:

```
fmda:client ERROR in login: Invalid credentials +0ms
fmda:client Status: 401 +1ms
fmda:client Response data: {
  "messages": [
    {
      "code": "212",
      "message": "Invalid user account and/or password"
    }
  ]
} +2ms
```

## Tips

### 1. Redirect Debug Logs to File

```bash
DEBUG=fmda:* npm run dev 2> debug.log
```

### 2. Watch Logs in Real-Time

```bash
DEBUG=fmda:* npm run dev 2>&1 | tee debug.log
```

### 3. Filter Specific Operations

```bash
DEBUG=fmda:client npm run dev 2>&1 | grep "POST\|PATCH\|DELETE"
```

### 4. Production Environments

In production, consider logging only errors and critical operations:

```bash
DEBUG=fmda:client,fmda:transport npm run start
```

## Disabling Debug Logging

Simply omit the `DEBUG` environment variable or set it to an empty string:

```bash
DEBUG= npm run dev
```

Or in Claude Desktop, remove the `DEBUG` key from the `env` section.

## Integration with Other Tools

### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/dist/index.js",
      "env": {
        "FM_SERVER": "your.server.com",
        "FM_DATABASE": "YourDatabase",
        "FM_USER": "username",
        "FM_PASSWORD": "password",
        "DEBUG": "fmda:*"
      }
    }
  ]
}
```

### Docker

```bash
docker run -e DEBUG=fmda:* -e FM_SERVER=... your-image
```

## Troubleshooting

### No Debug Output

1. Verify the `DEBUG` variable is set:
   ```bash
   echo $DEBUG
   ```

2. Check that debug package is installed:
   ```bash
   npm list debug
   ```

3. Ensure you're looking at stderr (debug logs go to stderr, not stdout)

### Too Much Output

Use namespace exclusion:
```bash
DEBUG=fmda:*,-fmda:verbose:* npm run dev
```

### Performance Impact

The `debug` package has minimal performance impact when disabled. When enabled:
- Basic logs: Negligible impact
- Verbose logs: Moderate impact due to JSON stringification
- Full logging: May slow down high-frequency operations

For production, use targeted logging:
```bash
DEBUG=fmda:client,fmda:transport npm run start
```

## Advanced Usage

### Programmatic Control

You can also control debug logging programmatically in your code:

```typescript
import { loggers } from "./logger.js";

// Manually log something
loggers.client("Custom debug message");

// Log with verbose details
loggers.clientVerbose("Detailed data:", JSON.stringify(data, null, 2));
```

### Custom Namespaces

The logger module exports functions to create custom namespaces:

```typescript
import { createLogger } from "./logger.js";

const myLogger = createLogger("custom");
myLogger("My custom log message");

// Enable with: DEBUG=fmda:custom
```

## Support

For issues with debug logging:
1. Check this documentation
2. Verify environment variable syntax
3. Review the logs for error messages
4. Report issues at https://github.com/yourusername/filemaker-data-api-mcp/issues
