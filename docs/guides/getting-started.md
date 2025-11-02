# Getting Started with FileMaker Data API MCP

Complete guide to installing, configuring, and using the FileMaker Data API MCP Server.

## Quick Start (5 Minutes)

### 1. Install

```bash
npm install -g filemaker-data-api-mcp
```

### 2. Configure Connection

```bash
filemaker-mcp config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password your_password
```

### 3. Set Default

```bash
filemaker-mcp config set-default production
```

### 4. Configure Claude Desktop

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add:

```json
{
  "mcpServers": {
    "filemaker": {
      "command": "filemaker-mcp",
      "args": ["start"]
    }
  }
}
```

### 5. Restart Claude Desktop

Quit and restart Claude Desktop. The FileMaker tools will now be available!

---

## Installation Options

### Option A: Global Installation (Recommended)

Install globally to use the `filemaker-mcp` command anywhere:

```bash
npm install -g filemaker-data-api-mcp
```

Verify installation:

```bash
filemaker-mcp --version
```

### Option B: Local Development

For development or contributing:

```bash
# Clone repository
git clone https://github.com/yourusername/filemaker-data-api-mcp.git
cd filemaker-data-api-mcp

# Install dependencies
npm install

# Build
npm run build

# Use locally
node dist/bin/cli.js config list-connections
```

---

## Configuration

### Managing Connections

#### Add a Connection

```bash
filemaker-mcp config add-connection <name> \
  --server <ip-address> \
  --database <database-name> \
  --user <username> \
  --password <password>
```

Example:

```bash
filemaker-mcp config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password secretpass
```

#### List All Connections

```bash
filemaker-mcp config list-connections
```

#### Set Default Connection

```bash
filemaker-mcp config set-default production
```

#### Remove a Connection

```bash
filemaker-mcp config remove-connection staging
```

#### View Configuration

```bash
filemaker-mcp config show
```

### Configuration Storage

Connections are stored in: `~/.filemaker-mcp/config.json`

File permissions are automatically set to `0o600` (read/write for owner only) for security.

---

## Claude Desktop Integration

### Configuration Methods

#### Method 1: Use CLI-Configured Connections (Recommended)

After setting up connections via CLI:

```json
{
  "mcpServers": {
    "filemaker": {
      "command": "filemaker-mcp",
      "args": ["start"]
    }
  }
}
```

#### Method 2: Environment Variables (Project-Specific)

For single-database setups:

```json
{
  "mcpServers": {
    "filemaker": {
      "command": "filemaker-mcp",
      "args": ["start"],
      "env": {
        "FM_SERVER": "192.168.0.24",
        "FM_DATABASE": "Sales",
        "FM_USER": "admin",
        "FM_PASSWORD": "your_password",
        "FM_VERSION": "vLatest"
      }
    }
  }
}
```

### Configuration Priority

1. **Environment variables** (highest) - defined in Claude config
2. **CLI-configured connections** - stored in config file
3. **Inline credentials** (lowest) - passed dynamically

---

## Using with Claude

### Example 1: Query Records

**You:** "Show me all contacts from the production database"

**Claude:** Connects and retrieves the data automatically.

### Example 2: Create a Record

**You:** "Add a new contact: John Smith, email john@example.com, phone 555-1234"

**Claude:** Creates the record with the provided information.

### Example 3: Switch Databases

**You:** "Show me contacts from production, then from staging"

**Claude:** Switches between connections and compares the data.

### Example 4: Ad-hoc Connection

**You:** "Connect to 192.168.0.26, database TestDB, user admin, password test123. Show all records."

**Claude:** Connects with inline credentials and queries the database.

---

## Troubleshooting

### "Command not found: filemaker-mcp"

```bash
# Reinstall globally
npm install -g filemaker-data-api-mcp

# Or check npm global bin path
npm config get prefix
```

### "Connection not found"

```bash
# List your connections
filemaker-mcp config list-connections

# Add if missing
filemaker-mcp config add-connection mydb --server ... --database ... --user ... --password ...
```

### Claude Desktop Not Seeing Tools

1. Verify installation: `filemaker-mcp --version`
2. Check Claude config file path is correct
3. Restart Claude Desktop completely (quit, not just close)
4. Check Claude Desktop logs for errors

### "Authentication failed" (Error 952)

- Verify FileMaker Server is running and accessible
- Check username and password are correct
- Ensure Data API is enabled on FileMaker Server
- Verify user has proper privileges in FileMaker

### "Layout not found" (Error 105)

- Layout names are case-sensitive
- Use `fm_get_layouts` to see exact layout names

### Permission Denied on Config File

```bash
chmod 600 ~/.filemaker-mcp/config.json
```

---

## Next Steps

1. **Explore your database** - Ask Claude to list layouts and fields
2. **Query records** - Try retrieving data from different layouts
3. **Create records** - Add new data through conversation
4. **Execute scripts** - Run FileMaker scripts via Claude
5. **Read the guides** - Check out the [User Guide](user-guide.md) and [API Reference](api-reference.md)

---

## Common FileMaker Error Codes

- **0**: Success
- **105**: Layout not found
- **401**: Record not found
- **802**: Unable to open file
- **952**: Invalid username/password or invalid token

---

For more detailed information, see:
- [User Guide](user-guide.md) - Complete usage documentation
- [API Reference](api-reference.md) - All tools documented
- [Deployment Guide](deployment.md) - Production setup
