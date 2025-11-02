# FileMaker Data API MCP - Usage Guide

## Overview

The FileMaker Data API MCP is now fully functional with dynamic connection management. You can use it in multiple ways:

1. **Local Development** - Run directly from source
2. **CLI Tool** - Use as a command-line utility
3. **Claude Desktop** - Integrate with Claude Desktop app
4. **npm Package** - Install globally or locally (coming soon)

---

## Option 1: Local Development (Current)

### Prerequisites
```bash
Node.js >= 18.0.0
npm or yarn
```

### Setup

1. **Clone/Navigate to project**
```bash
cd /Users/fsans/Desktop/FMDAPI-MCP
```

2. **Install dependencies**
```bash
npm install
```

3. **Build TypeScript**
```bash
npm run build
```

### Run the Server

**Method A: Direct Node**
```bash
node dist/index.js
```

**Method B: npm script**
```bash
npm start
```

**Method C: Development mode (with auto-rebuild)**
```bash
npm run dev
```

### Environment Setup

Create `.env` file in project root:
```bash
FM_SERVER=192.168.0.24
FM_VERSION=vLatest
FM_DATABASE=Sales
FM_USER=admin
FM_PASSWORD=yourpassword
MCP_TRANSPORT=stdio
```

---

## Option 2: CLI Tool (Local)

### Setup Connections

1. **Add a connection**
```bash
npm run build  # Build first
node dist/bin/cli.js config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password xxx
```

2. **List connections**
```bash
node dist/bin/cli.js config list-connections
```

3. **Set default**
```bash
node dist/bin/cli.js config set-default production
```

4. **View configuration**
```bash
node dist/bin/cli.js config show
```

### Start Server with Connection

```bash
# With default connection
node dist/bin/cli.js start

# With specific connection
node dist/bin/cli.js start --connection staging
```

---

## Option 3: Claude Desktop Integration (Recommended)

### Step 1: Build the Project
```bash
npm run build
```

### Step 2: Configure Claude Desktop

Edit Claude Desktop config file:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Add this configuration:
```json
{
  "mcpServers": {
    "filemaker": {
      "command": "node",
      "args": ["/Users/fsans/Desktop/FMDAPI-MCP/dist/index.js"],
      "env": {
        "FM_SERVER": "192.168.0.24",
        "FM_VERSION": "vLatest",
        "FM_DATABASE": "Sales",
        "FM_USER": "admin",
        "FM_PASSWORD": "yourpassword",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop. The FileMaker tools should now be available.

### Step 4: Use in Claude

**Example 1: Query with predefined connection**
```
User: "Show me all contacts from the production database"

Claude will:
1. Use fm_login() with production credentials
2. Call fm_get_records(layout: "Contacts")
3. Return the results
```

**Example 2: Switch databases**
```
User: "First show me production contacts, then staging contacts"

Claude will:
1. fm_set_connection("production")
2. fm_login()
3. fm_get_records(layout: "Contacts")
4. fm_set_connection("staging")
5. fm_login()
6. fm_get_records(layout: "Contacts")
7. Compare and return both
```

**Example 3: Inline connection**
```
User: "Connect to 192.168.0.26, database TestDB, user admin, password test123. Show me all records."

Claude will:
1. fm_connect(server: "192.168.0.26", database: "TestDB", user: "admin", password: "test123")
2. fm_login()
3. fm_get_records()
4. Return results
```

---

## Option 4: npm Package (Future - Phase 3)

### Current Status
The package is **ready to publish** but not yet on npm. To publish:

1. **Create npm account** at https://www.npmjs.com
2. **Login locally**
```bash
npm login
```

3. **Publish**
```bash
npm publish
```

### Once Published

**Global Installation**
```bash
npm install -g filemaker-data-api-mcp
```

**Then use CLI commands globally**
```bash
filemaker-mcp config add-connection production --server 192.168.0.24 --database Sales --user admin --password xxx
filemaker-mcp start
```

**Local Project Installation**
```bash
npm install --save-dev filemaker-data-api-mcp
```

---

## Available MCP Tools

### Configuration Tools (fm_config_*)

1. **fm_config_add_connection**
   - Add a new connection
   - Parameters: name, server, database, user, password, version

2. **fm_config_remove_connection**
   - Remove a connection
   - Parameters: name

3. **fm_config_list_connections**
   - List all connections
   - No parameters

4. **fm_config_get_connection**
   - Get connection details (password masked)
   - Parameters: name

5. **fm_config_set_default_connection**
   - Set default connection
   - Parameters: name

### Connection Tools (fm_*)

1. **fm_set_connection**
   - Switch to predefined connection
   - Parameters: connectionName

2. **fm_connect**
   - Connect with inline credentials
   - Parameters: server, database, user, password, version

3. **fm_list_connections**
   - List available connections
   - No parameters

4. **fm_get_current_connection**
   - Get current connection details
   - No parameters

### Data Access Tools (fm_*)

All existing FileMaker Data API tools work as before:
- fm_login / fm_logout
- fm_get_records / fm_create_record / fm_edit_record / fm_delete_record
- fm_find_records / fm_duplicate_record
- fm_get_layouts / fm_get_scripts / fm_get_layout_metadata
- fm_upload_to_container / fm_set_global_fields / fm_execute_script
- And more...

---

## Configuration Files

### Connections Storage
```
~/.filemaker-mcp/config.json
```

Example:
```json
{
  "server": {
    "transport": "stdio",
    "port": 3000,
    "host": "localhost"
  },
  "filemaker": {
    "server": "192.168.0.24",
    "version": "vLatest",
    "database": "Sales",
    "user": "admin",
    "password": "xxx"
  },
  "connections": {
    "production": {
      "name": "production",
      "server": "192.168.0.24",
      "database": "Sales",
      "user": "admin",
      "password": "xxx",
      "version": "vLatest"
    },
    "staging": {
      "name": "staging",
      "server": "192.168.0.25",
      "database": "SalesTest",
      "user": "admin",
      "password": "yyy",
      "version": "vLatest"
    }
  },
  "defaultConnection": "production"
}
```

### Environment Variables
```bash
# FileMaker Server
FM_SERVER=192.168.0.24
FM_VERSION=vLatest
FM_DATABASE=Sales
FM_USER=admin
FM_PASSWORD=xxx

# MCP Transport
MCP_TRANSPORT=stdio          # stdio, http, or https
MCP_HOST=localhost
MCP_PORT=3000

# HTTPS (if using https transport)
MCP_CERT_PATH=/path/to/cert.pem
MCP_KEY_PATH=/path/to/key.pem

# External Databases (JSON array)
FM_EXTERNAL_DATABASES='[{"database":"external","username":"user","password":"pass"}]'
```

---

## Quick Start Workflows

### Workflow 1: Setup and Use Locally

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Add connections
node dist/bin/cli.js config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password xxx

# 4. Set default
node dist/bin/cli.js config set-default production

# 5. Start server
node dist/bin/cli.js start
```

### Workflow 2: Use with Claude Desktop

```bash
# 1. Build
npm run build

# 2. Edit Claude config
# ~/Library/Application Support/Claude/claude_desktop_config.json
# Add filemaker server config (see Option 3 above)

# 3. Restart Claude Desktop

# 4. Use in Claude:
# "Show me all contacts"
# Claude will automatically use the configured connection
```

### Workflow 3: Development with Auto-Rebuild

```bash
# Terminal 1: Watch for changes
npm run watch

# Terminal 2: Run server
npm start

# Terminal 3: Use CLI
node dist/bin/cli.js config list-connections
```

---

## Testing

### Run Tests
```bash
npm test                    # All tests
npm test -- --coverage     # With coverage report
npm test -- --watch        # Watch mode
```

### Test Coverage
- Unit tests: 25+ cases
- Integration tests: 15+ cases
- E2E tests: 15+ scenarios
- Total: 55+ test cases

---

## Troubleshooting

### Issue: "Cannot find module"
```bash
# Solution: Rebuild
npm run build
```

### Issue: "Connection not found"
```bash
# Solution: List connections
node dist/bin/cli.js config list-connections

# Add if missing
node dist/bin/cli.js config add-connection myconn --server ... --database ... --user ... --password ...
```

### Issue: "Permission denied" on config file
```bash
# Solution: Fix permissions
chmod 600 ~/.filemaker-mcp/config.json
```

### Issue: Claude Desktop not recognizing tools
```bash
# Solution: 
# 1. Rebuild: npm run build
# 2. Restart Claude Desktop
# 3. Check config file path is correct
```

---

## Next Steps

### For Local Use Now
1. ✅ Build: `npm run build`
2. ✅ Add connections: `node dist/bin/cli.js config add-connection ...`
3. ✅ Start server: `node dist/bin/cli.js start`
4. ✅ Use in Claude Desktop (see Option 3)

### For npm Package (Phase 3)
1. Create npm account
2. Run `npm publish`
3. Users can then: `npm install -g filemaker-data-api-mcp`

### For GitHub (Phase 3)
1. Create GitHub repository
2. Push code
3. Set up GitHub Actions for CI/CD
4. Create releases

---

## Summary

**Right Now You Can**:
- ✅ Run the MCP server locally
- ✅ Use CLI commands to manage connections
- ✅ Integrate with Claude Desktop
- ✅ Query FileMaker databases through Claude
- ✅ Switch between multiple databases

**Soon (Phase 3)**:
- 📦 Install as npm package globally
- 🔄 Auto-publish to npm via GitHub Actions
- 📚 Full documentation on npm registry

**The MCP is production-ready for local use!**
