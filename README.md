# FileMaker Data API MCP Server

A Model Context Protocol (MCP) server that provides AI agents with direct access to FileMaker databases through the FileMaker Data API. Compatible with Claude Desktop, Claude Code Console, Windsurf, Cursor, Cline, and other MCP-enabled AI assistants.

[![npm version](https://badge.fury.io/js/filemaker-data-api-mcp.svg)](https://www.npmjs.com/package/filemaker-data-api-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What It Does

This MCP server acts as a bridge between AI agents and FileMaker databases, enabling natural language interactions with your FileMaker data and database structure:

### Data Interaction
- **Query databases** - Retrieve, search, and analyze FileMaker records
- **Manage records** - Create, update, delete, and duplicate records through conversation
- **Execute scripts** - Run FileMaker scripts with parameters
- **Upload files** - Add files to container fields (including repetitions)
- **Set global fields** - Manage FileMaker global fields programmatically
- **Multi-database support** - Switch between different FileMaker databases dynamically

### Database Introspection
- **Discover structure** - AI agents can introspect database schemas, layouts, and field definitions
- **Understand relationships** - Access portal and related table information
- **Architect solutions** - Enable AI to design and implement FileMaker applications through natural language
- **Metadata access** - Get complete information about layouts, fields, value lists, and scripts

This introspection capability allows AI agents to understand your database architecture and help you build, modify, and optimize FileMaker solutions through simple conversation.

## Quick Start

### Installation

```bash
npm install -g filemaker-data-api-mcp
```

### Setup

```bash
# Add your FileMaker connection
filemaker-mcp config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password your_password

# Set as default
filemaker-mcp config set-default production
```

### Configure Your AI Agent

#### Claude Desktop

Edit your configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

#### Windsurf / Cursor / Cline

Add to your MCP settings configuration:

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

Restart your AI agent and you're ready!

## Features

### Connection Management
- ✅ **Multiple connections** - Store and switch between different FileMaker databases
- ✅ **Dynamic switching** - Change databases during conversations
- ✅ **Inline credentials** - Connect with ad-hoc credentials without pre-configuration
- ✅ **Secure storage** - Credentials stored with restricted file permissions

### Data Operations
- ✅ **Authentication** - Login, logout, session validation
- ✅ **Records** - Create, read, update, delete, duplicate, find
- ✅ **Metadata** - Access database, layout, and script information
- ✅ **Container fields** - Upload files (including repetitions)
- ✅ **Global fields** - Set global field values
- ✅ **Scripts** - Execute FileMaker scripts with parameters
- ✅ **Portal data** - Access related records through portals

### Network Transport
- ✅ **stdio** - Local use with Claude Desktop (default)
- ✅ **HTTP/HTTPS** - Network deployment for remote access

## Usage Examples

### Example 1: Query Your Database

**You ask:**
```
"Show me all contacts from the production database"
```

The AI agent automatically connects and retrieves the data.

### Example 2: Database Introspection

**You ask:**
```
"What is the structure of the Contacts layout? Show me all fields and their types."
```

The AI agent introspects the database schema and provides detailed field information.

### Example 3: Switch Between Databases

**You ask:**
```
"Compare sales records from production and staging databases"
```

The AI agent switches between connections and compares the data.

### Example 4: Create Records

**You ask:**
```
"Add a new contact: John Smith, john@example.com, 555-1234"
```

The AI agent creates the record with the provided information.

### Example 5: Ad-hoc Connection

**You ask:**
```
"Connect to 192.168.0.26, database TestDB, user admin, password test123. Show all records."
```

The AI agent connects with inline credentials and queries the database.

### Example 6: Solution Architecture

**You ask:**
```
"Design a customer management system with contacts, orders, and products. Create the layouts and suggest field definitions."
```

The AI agent uses database introspection to understand your current structure and helps architect the solution.

## Configuration

### CLI Commands

```bash
# Initial setup
filemaker-mcp setup

# Connection management
filemaker-mcp config add-connection <name> [options]
filemaker-mcp config remove-connection <name>
filemaker-mcp config list-connections
filemaker-mcp config set-default <name>
filemaker-mcp config show

# Start server
filemaker-mcp start

# Configure Claude Desktop
filemaker-mcp configure-claude
```

### Environment Variables

You can also configure via environment variables in the Claude Desktop config:

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

1. **Environment variables** (highest) - defined in MCP config
2. **CLI-configured connections** - stored in `~/.filemaker-mcp/config.json`
3. **Inline credentials** (lowest) - passed dynamically via tool parameters

## Available Tools

The MCP server provides 28 tools for interacting with FileMaker:

### Authentication (3 tools)
- `fm_login` - Authenticate with FileMaker Server
- `fm_logout` - End session
- `fm_validate_session` - Check session validity

### Metadata (5 tools)
- `fm_get_product_info` - Get FileMaker Server info
- `fm_get_databases` - List available databases
- `fm_get_layouts` - Get layouts for a database
- `fm_get_scripts` - Get scripts for a database
- `fm_get_layout_metadata` - Get layout field metadata

### Records (7 tools)
- `fm_get_records` - Get records with pagination
- `fm_get_record_by_id` - Get single record
- `fm_create_record` - Create new record
- `fm_edit_record` - Update existing record
- `fm_delete_record` - Delete record
- `fm_duplicate_record` - Duplicate record
- `fm_find_records` - Search records

### Container Fields (2 tools)
- `fm_upload_to_container` - Upload file to container field
- `fm_upload_to_container_repetition` - Upload to repeating container field

### Global Fields (1 tool)
- `fm_set_global_fields` - Set global field values

### Scripts (1 tool)
- `fm_execute_script` - Execute FileMaker script

### Configuration Tools (5 tools)

- `fm_config_add_connection` - Add predefined connection
- `fm_config_remove_connection` - Remove connection
- `fm_config_list_connections` - List all configured connections
- `fm_config_get_connection` - Get connection details (password masked)
- `fm_config_set_default_connection` - Set default connection

### Connection Tools (4 tools)
- `fm_set_connection` - Switch to predefined connection
- `fm_connect` - Connect with inline credentials (one-time)
- `fm_list_connections` - List available connections
- `fm_get_current_connection` - Show current connection details

## Prerequisites

- **Node.js** v18 or higher
- **FileMaker Server** with Data API enabled
- **Valid FileMaker credentials** with appropriate privileges

## Documentation

- **[Getting Started Guide](docs/guides/getting-started.md)** - Detailed setup instructions
- **[User Guide](docs/guides/user-guide.md)** - Complete usage documentation
- **[Token Lifecycle Management](docs/guides/TOKEN_LIFECYCLE.md)** - Token caching, refresh, and error recovery
- **[Deployment Guide](docs/guides/deployment.md)** - Production deployment instructions
- **[API Reference](docs/guides/api-reference.md)** - All tools documented
- **[Development Guide](docs/development/)** - For contributors

## Security

- Credentials stored in `~/.filemaker-mcp/config.json` with restricted permissions (0o600)
- Passwords masked in list/show commands
- Never share your config file or commit it to version control
- Use strong passwords for FileMaker Server accounts
- For production, consider using environment variables

## Troubleshooting

### Connection Issues

```bash
# List your connections
filemaker-mcp config list-connections

# Verify connection details
filemaker-mcp config show
```

### Claude Desktop Not Responding

1. Verify installation: `filemaker-mcp config list-connections`
2. Rebuild if needed: `npm install -g filemaker-data-api-mcp@latest`
3. Restart Claude Desktop

### Authentication Failed

- Verify FileMaker Server is running and accessible
- Check username and password are correct
- Ensure Data API is enabled on FileMaker Server
- Verify user has proper privileges

## Development

### Local Development

```bash
# Clone repository (update URL after publishing)
git clone https://github.com/yourusername/filemaker-data-api-mcp.git
cd filemaker-data-api-mcp

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start in development mode
npm run dev
```

### Use as Library

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

## Contributing

Contributions are welcome! See the [Development Guide](docs/development/) for implementation details and the [Testing Guide](docs/development/phase-2g-testing.md) for testing guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Resources

- [FileMaker Data API Guide](https://help.claris.com/en/data-api-guide/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop Documentation](https://docs.anthropic.com/claude/docs)

## Support

- **Documentation**: [docs/](docs/)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Issues**: GitHub Issues (update URL after publishing)

---

**Made with ❤️ for the FileMaker and AI community**
