# LaunchD Agent Setup for FileMaker MCP Server

This guide explains how to set up the FileMaker MCP server as a launchd agent that starts automatically on macOS.

## What is LaunchD?

LaunchD is macOS's service management framework. It can automatically start, stop, and monitor services. This setup will:
- Start the MCP server automatically when you log in
- Restart the server if it crashes
- Manage logging automatically

## Prerequisites

1. Build the project first:
   ```bash
   npm run build
   ```

2. Create a logs directory:
   ```bash
   mkdir -p logs
   ```

## Installation Steps

### 1. Configure Environment Variables

Edit [com.filemaker.mcp.plist](com.filemaker.mcp.plist) and update the `EnvironmentVariables` section with your FileMaker Server configuration:

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>FM_SERVER</key>
    <string>your-server-address</string>
    <key>FM_VERSION</key>
    <string>vLatest</string>
    <key>FM_DATABASE</key>
    <string>your-database-name</string>
    <key>FM_USER</key>
    <string>your-username</string>
    <key>FM_PASSWORD</key>
    <string>your-password</string>
</dict>
```

**Optional configurations:**

For HTTP/HTTPS transport mode, uncomment and set:
```xml
<key>TRANSPORT</key>
<string>HTTP</string>
```

For external database sources, uncomment and set:
```xml
<key>FM_EXTERNAL_DATABASES</key>
<string>[{"database":"SalesDB","username":"user","password":"pass"}]</string>
```

### 2. Copy the plist to LaunchAgents

```bash
cp com.filemaker.mcp.plist ~/Library/LaunchAgents/
```

### 3. Load the Agent

```bash
launchctl load ~/Library/LaunchAgents/com.filemaker.mcp.plist
```

The server should now be running!

## Managing the Service

### Check if the service is running
```bash
launchctl list | grep com.filemaker.mcp
```

### Start the service manually
```bash
launchctl start com.filemaker.mcp
```

### Stop the service
```bash
launchctl stop com.filemaker.mcp
```

### Unload the service (disable autostart)
```bash
launchctl unload ~/Library/LaunchAgents/com.filemaker.mcp.plist
```

### Reload after making changes
```bash
launchctl unload ~/Library/LaunchAgents/com.filemaker.mcp.plist
cp com.filemaker.mcp.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.filemaker.mcp.plist
```

## Viewing Logs

### Standard output (normal logs)
```bash
tail -f logs/mcp-server.log
```

### Error output (error logs)
```bash
tail -f logs/mcp-server-error.log
```

### View all logs in real-time
```bash
tail -f logs/mcp-server*.log
```

## Troubleshooting

### Service won't start

1. Check the logs:
   ```bash
   cat logs/mcp-server-error.log
   ```

2. Verify the paths in the plist file are correct:
   - Node.js path (check with `which node`)
   - Project directory path
   - dist/index.js exists

3. Ensure the project is built:
   ```bash
   npm run build
   ```

### Service keeps restarting

Check the error logs for issues:
```bash
tail -f logs/mcp-server-error.log
```

Common issues:
- Incorrect FileMaker credentials
- FileMaker Server not accessible
- Missing environment variables

### Can't connect from Claude Desktop

The launchd agent runs the MCP server as a background process. To use it with Claude Desktop, you still need to configure Claude Desktop to communicate with the server using stdio transport.

In your Claude Desktop config ([~/Library/Application Support/Claude/claude_desktop_config.json](~/Library/Application Support/Claude/claude_desktop_config.json)):

```json
{
  "mcpServers": {
    "filemaker": {
      "command": "node",
      "args": ["/Users/fsans/Desktop/FMDAPI-MCP/dist/index.js"],
      "env": {
        "FM_SERVER": "192.168.0.24",
        "FM_VERSION": "vLatest",
        "FM_DATABASE": "Contacts",
        "FM_USER": "admin",
        "FM_PASSWORD": "your_password"
      }
    }
  }
}
```

## Security Notes

- The plist file contains sensitive credentials (passwords). Keep it secure.
- File permissions should be restrictive:
  ```bash
  chmod 600 ~/Library/LaunchAgents/com.filemaker.mcp.plist
  ```
- Consider using a dedicated FileMaker user account with minimal privileges for the MCP server.

## Updating Node.js Version

If you update Node.js (especially if using nvm), you'll need to update the node path in the plist file:

1. Find the new node path:
   ```bash
   which node
   ```

2. Edit [com.filemaker.mcp.plist](com.filemaker.mcp.plist) and update the first `ProgramArguments` entry

3. Reload the service (see "Reload after making changes" above)
