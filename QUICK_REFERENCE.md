# FileMaker Data API MCP - Quick Reference

## Setup Commands

```bash
# Clone and setup
git clone <repo> && cd FMDAPI-MCP

# Install and build
npm install && npm run build

# Configure
cp .env.example .env
nano .env  # Edit with your FileMaker Server details

# Start
npm start
```

## Environment Variables Quick Reference

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `FM_SERVER` | `192.168.0.24` | Yes | FileMaker Server IP/hostname (no https://) |
| `FM_VERSION` | `vLatest` | Yes | API version: vLatest, v1, v2 |
| `FM_DATABASE` | `Contacts` | Yes | Default database name (can override) |
| `FM_USER` | `admin` | Yes | FileMaker Server username |
| `FM_PASSWORD` | `secret` | Yes | FileMaker Server password |

## Tools Reference

### Authentication (3 tools)
```
fm_login                    # Authenticate and get session token
fm_logout                   # End session
fm_validate_session         # Check if token is valid
```

### Metadata (5 tools)
```
fm_get_product_info         # Server info (date/time formats)
fm_get_databases            # List all databases
fm_get_layouts [database]   # Get layouts for database
fm_get_scripts [database]   # Get scripts for database
fm_get_layout_metadata      # Get field definitions (required: layout)
```

### Records - Read (3 tools)
```
fm_get_records              # Get records with pagination (required: layout)
fm_get_record_by_id         # Get single record (required: layout, recordId)
fm_find_records             # Search records (required: layout, query)
```

### Records - Write (4 tools)
```
fm_create_record            # Create new record (required: layout, fieldData)
fm_edit_record              # Update record (required: layout, recordId, fieldData)
fm_delete_record            # Delete record (required: layout, recordId)
fm_duplicate_record         # Clone record (required: layout, recordId)
```

### File Operations (2 tools)
```
fm_upload_to_container      # Upload file (required: layout, recordId, containerFieldName, filePath)
fm_upload_to_container_repetition  # Upload to repeated field (add: repetition)
```

### Special (2 tools)
```
fm_set_global_fields        # Set global field values (required: globalFields)
fm_execute_script           # Run FileMaker script (required: layout, scriptName)
```

## Common Workflows

### 1. Connect and Explore
```
1. fm_login
2. fm_get_databases
3. fm_get_layouts [database]
4. fm_get_layout_metadata [layout]
```

### 2. Create and Update Records
```
1. fm_login
2. fm_create_record [layout, fieldData]
3. fm_edit_record [layout, recordId, fieldData]
4. fm_get_record_by_id [layout, recordId]
```

### 3. Search Records
```
1. fm_login
2. fm_find_records [layout, query]
3. # Process results
4. fm_logout
```

### 4. Upload Files
```
1. fm_login
2. fm_create_record [layout, fieldData]
3. fm_upload_to_container [layout, recordId, containerField, filePath]
```

## Claude Desktop Configuration

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "filemaker": {
      "command": "node",
      "args": ["/absolute/path/to/FMDAPI-MCP/dist/index.js"],
      "env": {
        "FM_SERVER": "192.168.0.24",
        "FM_VERSION": "vLatest",
        "FM_DATABASE": "Contacts",
        "FM_USER": "admin",
        "FM_PASSWORD": "password"
      }
    }
  }
}
```

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json` (same format, use Windows paths)

## Useful Commands

```bash
# Development with auto-rebuild
npm run watch

# Run in development mode
npm run dev

# Build only
npm run build

# Start the server
npm start

# Check build output
ls -la dist/

# Verify configuration
cat .env

# Test connectivity
ping $FM_SERVER

# Count tools
grep -c '"name": "fm_' dist/index.js

# Check Node version
node --version

# Reinstall dependencies
rm -rf node_modules && npm install
```

## Error Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module` | Dependencies missing | `npm install` |
| `FM_SERVER not found` | No .env file | `cp .env.example .env` |
| `Connection refused` | FM Server unreachable | Check IP/hostname, network |
| `Invalid credentials` | Wrong username/password | Verify in FileMaker Pro |
| `Layout not found` | Typo in layout name | Use `fm_get_layouts` first |
| `Session expired` | Token timed out | Call `fm_login` again |
| `Permission denied` | Insufficient access | Check FileMaker Server permissions |

## File Locations

```
FMDAPI-MCP/
├── dist/index.js              # Compiled server (run this)
├── src/index.ts               # TypeScript source
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── .env                       # Configuration (YOUR CREDENTIALS)
├── .env.example               # Configuration template
├── README.md                  # Full documentation
├── DEPLOYMENT_AND_TESTING.md  # Detailed guides
├── QUICKSTART.md              # 5-minute setup
├── CHANGELOG.md               # Version history
└── DataAPI.postman_collection.json  # Postman tests
```

## Important Notes

- ⚠️ **Never commit .env** - Contains passwords
- ⚠️ **Use absolute paths** in Claude Desktop config
- ⚠️ **Restart Claude Desktop** after config changes
- ✓ SSL verification disabled by default (dev mode)
- ✓ All 20 tools available after build
- ✓ Node.js v18+ required

## Quick Start (30 seconds)

```bash
cd /path/to/FMDAPI-MCP
npm install
cp .env.example .env
# Edit .env with your FileMaker Server details
npm run build
npm start
```

## Get Help

- Detailed guide: [DEPLOYMENT_AND_TESTING.md](DEPLOYMENT_AND_TESTING.md)
- Quick start: [QUICKSTART.md](QUICKSTART.md)
- Full docs: [README.md](README.md)
- FileMaker API: https://help.claris.com/en/data-api-guide/
- MCP Protocol: https://modelcontextprotocol.io/

