# Getting Started: FileMaker Data API MCP

## TL;DR - Quick Start (5 minutes)

### 1. Build the Project
```bash
npm install
npm run build
```

### 2. Add Your FileMaker Connection
```bash
node dist/bin/cli.js config add-connection mydb \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password yourpassword
```

### 3. Start the Server
```bash
node dist/bin/cli.js start
```

### 4. Use in Claude Desktop
Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add:
```json
{
  "mcpServers": {
    "filemaker": {
      "command": "node",
      "args": ["/Users/fsans/Desktop/FMDAPI-MCP/dist/index.js"],
      "env": {
        "FM_SERVER": "192.168.0.24",
        "FM_DATABASE": "Sales",
        "FM_USER": "admin",
        "FM_PASSWORD": "yourpassword"
      }
    }
  }
}
```

Restart Claude Desktop and you're done!

---

## How It Works

### Architecture
```
┌─────────────────────────────────────────┐
│         Claude Desktop                   │
│  (or any MCP client)                    │
└────────────┬────────────────────────────┘
             │ MCP Protocol
             ▼
┌─────────────────────────────────────────┐
│    FileMaker MCP Server                 │
│  ┌─────────────────────────────────────┐│
│  │  Connection Manager                 ││
│  │  - Manages multiple connections     ││
│  │  - Stores in ~/.filemaker-mcp/      ││
│  │  - Switches between databases       ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │  MCP Tools (9 new + 20 existing)   ││
│  │  - Configuration tools              ││
│  │  - Connection tools                 ││
│  │  - Data access tools                ││
│  └─────────────────────────────────────┘│
└────────────┬────────────────────────────┘
             │ REST API
             ▼
┌─────────────────────────────────────────┐
│    FileMaker Server                     │
│    (Data API)                           │
└─────────────────────────────────────────┘
```

### Three Ways to Use

#### Option A: Direct CLI
```bash
# Add connection
node dist/bin/cli.js config add-connection prod --server 192.168.0.24 --database Sales --user admin --password xxx

# List connections
node dist/bin/cli.js config list-connections

# Start server
node dist/bin/cli.js start
```

#### Option B: Claude Desktop (Recommended)
1. Configure in Claude Desktop config file
2. Restart Claude
3. Use in conversations:
   - "Show me all contacts"
   - "Connect to staging and show records"
   - "Query production then staging"

#### Option C: npm Package (Coming Soon)
```bash
npm install -g filemaker-data-api-mcp
filemaker-mcp config add-connection prod --server 192.168.0.24 --database Sales --user admin --password xxx
filemaker-mcp start
```

---

## Common Tasks

### Add a Connection
```bash
node dist/bin/cli.js config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password xxx
```

### List All Connections
```bash
node dist/bin/cli.js config list-connections
```

### Set Default Connection
```bash
node dist/bin/cli.js config set-default production
```

### Remove a Connection
```bash
node dist/bin/cli.js config remove-connection staging
```

### View Configuration
```bash
node dist/bin/cli.js config show
```

### Start Server
```bash
node dist/bin/cli.js start
```

---

## Using in Claude

### Example 1: Query Production
```
User: "Show me all contacts from production"

Claude automatically:
1. Uses fm_set_connection("production")
2. Calls fm_login()
3. Calls fm_get_records(layout: "Contacts")
4. Returns results
```

### Example 2: Compare Databases
```
User: "Show me contacts from production and staging"

Claude automatically:
1. Switches to production
2. Queries contacts
3. Switches to staging
4. Queries contacts
5. Compares and returns both
```

### Example 3: Ad-hoc Connection
```
User: "Connect to 192.168.0.26, database TestDB, show all records"

Claude automatically:
1. Uses fm_connect() with inline credentials
2. Calls fm_login()
3. Calls fm_get_records()
4. Returns results
```

---

## File Locations

### Configuration
```
~/.filemaker-mcp/config.json
```

### Project
```
/Users/fsans/Desktop/FMDAPI-MCP/
├── src/              # Source code
├── dist/             # Compiled JavaScript
├── tests/            # Test suite
└── package.json      # Dependencies
```

---

## Troubleshooting

### "Command not found"
```bash
# Make sure you built first
npm run build

# Then use full path
node dist/bin/cli.js config list-connections
```

### "Connection not found"
```bash
# List your connections
node dist/bin/cli.js config list-connections

# Add if missing
node dist/bin/cli.js config add-connection mydb --server ... --database ... --user ... --password ...
```

### Claude not seeing tools
```bash
# 1. Rebuild
npm run build

# 2. Restart Claude Desktop

# 3. Check config file path is correct
```

### Permission denied on config
```bash
# Fix permissions
chmod 600 ~/.filemaker-mcp/config.json
```

---

## What's Available

### 9 New Connection Management Tools
- `fm_config_add_connection` - Add connection
- `fm_config_remove_connection` - Remove connection
- `fm_config_list_connections` - List connections
- `fm_config_get_connection` - Get details
- `fm_config_set_default_connection` - Set default
- `fm_set_connection` - Switch connection
- `fm_connect` - Inline connection
- `fm_list_connections` - List available
- `fm_get_current_connection` - Current connection

### 20+ Existing Data Access Tools
- Authentication: `fm_login`, `fm_logout`, `fm_validate_session`
- Records: `fm_get_records`, `fm_create_record`, `fm_edit_record`, `fm_delete_record`, `fm_find_records`, `fm_duplicate_record`
- Metadata: `fm_get_databases`, `fm_get_layouts`, `fm_get_scripts`, `fm_get_layout_metadata`, `fm_get_product_info`
- Advanced: `fm_upload_to_container`, `fm_set_global_fields`, `fm_execute_script`
- And more...

---

## Next Steps

1. **Now**: Use locally with Claude Desktop
2. **Soon**: Publish to npm registry (Phase 3)
3. **Later**: GitHub Actions for auto-publishing

---

## Support

For detailed information, see:
- `USAGE_GUIDE.md` - Complete usage guide
- `PHASE_2_COMPLETE_SUMMARY.md` - Full implementation details
- `PHASE_2G_TESTING.md` - Testing information
- `README.md` - Project overview

---

**You're ready to use the FileMaker MCP! 🚀**
