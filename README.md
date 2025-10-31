# FileMaker Data API MCP Server

A Model Context Protocol (MCP) server that provides access to FileMaker databases through the FileMaker Data API. Use this with AI assistants like Claude, ChatGPT, and other MCP-compatible agents to interact with FileMaker databases, perform CRUD operations, manage records, and execute searches.

## What It Does

This MCP server acts as a bridge between AI assistants and FileMaker databases:

- **Query FileMaker databases** - Ask Claude to retrieve records, search data, or get database metadata
- **Manage records** - Create, update, delete, or duplicate records through natural language
- **Multi-database support** - Switch between different FileMaker databases on the fly
- **Execute scripts** - Run FileMaker scripts from your AI conversations
- **Upload files** - Add files to container fields directly from conversations
- **Set global fields** - Manage FileMaker global fields programmatically

## Features

- ✅ **Authentication**: Login, logout, and session validation
- ✅ **Metadata**: Access database, layout, and script information
- ✅ **Records**: Create, read, update, delete, duplicate, and find records
- ✅ **Container Fields**: Upload files to container fields (including repetitions)
- ✅ **Global Fields**: Set global field values
- ✅ **Scripts**: Execute FileMaker scripts with parameters
- ✅ **Portal Data**: Access related records through portals
- ✅ **Dynamic Connections**: Switch between multiple FileMaker databases
- ✅ **Inline Credentials**: Connect with ad-hoc credentials without pre-configuration

## Prerequisites

- **Node.js** v18 or higher
- **FileMaker Server** with Data API enabled
- **Valid FileMaker credentials** (username/password)

## Quick Start

### 1. Install Globally

```bash
npm install -g filemaker-data-api-mcp
```

### 2. Configure Your Connection

```bash
filemaker-mcp config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password your_password
```

### 3. Set as Default (Optional)

```bash
filemaker-mcp config set-default production
```

### 4. Verify Installation

```bash
filemaker-mcp config list-connections
```

## Installation for AI Assistants

### Claude Desktop (Example Configuration)

1. **Install globally:**

   ```bash
   npm install -g filemaker-data-api-mcp
   ```

2. **Edit your MCP configuration file:**
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Add the FileMaker MCP server:**

   **Basic Configuration (uses CLI-configured connections):**

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

   **Project-Specific Configuration (hardcoded credentials):**

   Useful when you want to connect to a specific database without CLI setup, or for project-specific deployments:

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

4. **Restart Claude Desktop**

### Other MCP-Compatible Clients

The same configuration works for other MCP-compatible AI assistants. Refer to your specific client's documentation for the MCP configuration file location:

- **Windsurf IDE**: `~/.windsurf/mcp.json`
- **Cursor IDE**: `~/.cursor/mcp.json`
- **Kili IDE**: `~/.kili/mcp.json`
- **Other MCP clients**: Check their documentation for MCP server configuration

The JSON configuration structure is the same across all clients - just use the appropriate file path for your client.

### Configuration Priority

The MCP server uses this priority order for configuration:

1. **Environment variables** (highest priority) - defined in MCP config `env` block
2. **CLI-configured connections** - stored in `~/.filemaker-mcp/config.json`
3. **Inline credentials** (lowest priority) - passed dynamically via tool parameters

**When to use each approach:**

- **Environment variables**: Project-specific setups, single database per project, CI/CD deployments
- **CLI-configured connections**: Multiple databases, switching between environments, personal global setup
- **Inline credentials**: One-off connections, testing, temporary access

### Local Development (Library)

For use as a library in your own Node.js project:

```bash
npm install filemaker-data-api-mcp
```

Then import and use:

```typescript
import { ConnectionManager } from 'filemaker-data-api-mcp';

const manager = new ConnectionManager();
manager.addConnection('mydb', {
  server: '192.168.0.24',
  database: 'Sales',
  user: 'admin',
  password: 'xxx',
  version: 'vLatest'
});
```

## Available Tools

### Authentication

- **fm_login**: Authenticate with FileMaker Server and get a session token
  - Parameters: `database` (optional), `username` (optional), `password` (optional), `fmDataSource` (optional)
  - For external databases (FileMaker External Database Sources), you can configure credentials in two ways:

    **Option 1: Configure in .env file** (recommended for persistent configuration):

    ```env
    FM_EXTERNAL_DATABASES='[
      {"database":"SalesDB","username":"sales_user","password":"sales_password"},
      {"database":"InventoryDB","username":"inventory_user","password":"inventory_password"}
    ]'
    ```

    **Option 2: Pass via fmDataSource parameter** (for dynamic/temporary credentials):

    ```json
    {
      "fmDataSource": [
        {
          "database": "SalesDB",
          "username": "sales_user",
          "password": "sales_password"
        },
        {
          "database": "InventoryDB",
          "username": "inventory_user",
          "password": "inventory_password"
        }
      ]
    }
    ```

    **Note**: External database credentials passed via `fmDataSource` parameter override those configured in the `.env` file.

- **fm_logout**: End the current FileMaker Server session

- **fm_validate_session**: Check if the current session token is valid

### Metadata

- **fm_get_product_info**: Get FileMaker Server product information

- **fm_get_databases**: List all available databases

- **fm_get_layouts**: Get all layouts for a database
  - Parameters: `database` (optional)

- **fm_get_scripts**: Get all scripts for a database
  - Parameters: `database` (optional)

- **fm_get_layout_metadata**: Get metadata for a specific layout
  - Parameters: `layout` (required), `database` (optional)

### Records

- **fm_get_records**: Get records from a layout with pagination
  - Parameters: `layout` (required), `offset` (optional, default: 1), `limit` (optional, default: 20), `database` (optional)

- **fm_get_record_by_id**: Get a single record by its recordId
  - Parameters: `layout` (required), `recordId` (required), `database` (optional)

- **fm_create_record**: Create a new record
  - Parameters: `layout` (required), `fieldData` (required), `database` (optional)
  - Example: `{"layout": "Contacts", "fieldData": {"FirstName": "John", "LastName": "Doe"}}`

- **fm_edit_record**: Edit an existing record
  - Parameters: `layout` (required), `recordId` (required), `fieldData` (required), `database` (optional)

- **fm_delete_record**: Delete a record
  - Parameters: `layout` (required), `recordId` (required), `database` (optional)

- **fm_duplicate_record**: Duplicate an existing record
  - Parameters: `layout` (required), `recordId` (required), `database` (optional)

- **fm_find_records**: Find records using a query
  - Parameters: `layout` (required), `query` (required), `offset` (optional), `limit` (optional), `database` (optional)
  - Example: `{"layout": "Contacts", "query": [{"FirstName": "John"}]}`

### Container Fields

- **fm_upload_to_container**: Upload a file to a container field
  - Parameters: `layout` (required), `recordId` (required), `containerFieldName` (required), `filePath` (required), `database` (optional)

- **fm_upload_to_container_repetition**: Upload a file to a container field with repetition
  - Parameters: `layout` (required), `recordId` (required), `containerFieldName` (required), `repetition` (required), `filePath` (required), `database` (optional)
  - Example: `{"layout": "Documents", "recordId": "123", "containerFieldName": "Files", "repetition": 2, "filePath": "/path/to/file.pdf"}`

### Global Fields

- **fm_set_global_fields**: Set global field values
  - Parameters: `globalFields` (required), `database` (optional)
  - Example: `{"globalFields": {"SAMPLE": "test"}}`

### Scripts

- **fm_execute_script**: Execute a FileMaker script
  - Parameters: `layout` (required), `scriptName` (required), `scriptParameter` (optional), `database` (optional)
  - Example: `{"layout": "Contacts", "scriptName": "UpdateRecords", "scriptParameter": "param1"}`

## Usage Examples

### Example 1: Query Production Database

**In Claude:**

```text
"Show me all contacts from the production database"
```

Claude will automatically:

1. Use your configured production connection
2. Query the Contacts layout
3. Return all records

### Example 2: Switch Between Databases

**In Claude:**

```text
"First show me sales records from production, then from staging"
```

Claude will:

1. Switch to production database
2. Query sales records
3. Switch to staging database
4. Query sales records
5. Compare both results

### Example 3: Create a Record

**In Claude:**

```text
"Add a new contact: John Smith, john@example.com, 555-1234"
```

Claude will create the record with the provided information.

### Example 4: Ad-hoc Connection

**In Claude:**

```text
"Connect to 192.168.0.26, database TestDB, user admin, password test123. Show me all records."
```

Claude will connect with inline credentials without pre-configuration.

## Configuration Management

### Add a Connection

```bash
filemaker-mcp config add-connection staging \
  --server 192.168.0.25 \
  --database SalesTest \
  --user admin \
  --password staging_password
```

### List All Connections

```bash
filemaker-mcp config list-connections
```

### Set Default Connection

```bash
filemaker-mcp config set-default production
```

### Remove a Connection

```bash
filemaker-mcp config remove-connection staging
```

### View Configuration

```bash
filemaker-mcp config show
```

## Security Notes

- Credentials are stored in `~/.filemaker-mcp/config.json` with restricted permissions (0o600)
- Passwords are masked in list/show commands
- Never share your config file or commit it to version control
- Use strong passwords for FileMaker Server accounts
- For production, consider using environment variables instead of stored credentials

## Troubleshooting

### "Connection not found" error

```bash
# List your connections
filemaker-mcp config list-connections

# Add the connection if missing
filemaker-mcp config add-connection mydb --server ... --database ... --user ... --password ...
```

### "MCP server not responding" in Claude

1. Verify installation: `filemaker-mcp config list-connections`
2. Rebuild if needed: `npm install -g filemaker-data-api-mcp@latest`
3. Restart your AI assistant (Claude, Windsurf, etc.)

### "Authentication failed" error

- Verify FileMaker Server is running
- Check username and password are correct
- Ensure Data API is enabled on FileMaker Server
- Verify network connectivity to FileMaker Server

### Permission denied on config file

```bash
chmod 600 ~/.filemaker-mcp/config.json
```

## License

MIT

## Resources

- [FileMaker Data API Guide](https://help.claris.com/en/data-api-guide/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
