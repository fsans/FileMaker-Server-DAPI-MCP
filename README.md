# FileMaker Data API MCP Server

A Model Context Protocol (MCP) server that provides access to FileMaker databases through the FileMaker Data API. This server enables AI assistants like Claude to interact with FileMaker databases, perform CRUD operations, manage records, and execute searches.

## Features

- **Authentication**: Login, logout, and session validation
- **Metadata**: Access database, layout, and script information
- **Records**: Create, read, update, delete, duplicate, and find records
- **Container Fields**: Upload files to container fields (including repetitions)
- **Global Fields**: Set global field values
- **Scripts**: Execute FileMaker scripts with parameters
- **Portal Data**: Access related records through portals

## Version

This server implements **FileMaker Data API version 1.0.3** compatible with **FileMaker Server 2025**.

## Prerequisites

- Node.js (v18 or higher)
- FileMaker Server with Data API enabled
- Valid FileMaker Server credentials

## Installation

1. Clone or download this repository:

```bash
cd FMDAPI-MCP
```

1. Install dependencies:

```bash
npm install
```

1. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

1. Edit `.env` with your FileMaker Server configuration:

```env
FM_SERVER=192.168.0.24
FM_VERSION=vLatest
FM_DATABASE=Contacts
FM_USER=admin
FM_PASSWORD=your_password
```

1. Build the TypeScript code:

```bash
npm run build
```

## Usage

### Running the Server

Start the MCP server:

```bash
npm start
```

Or for development with auto-rebuild:

```bash
npm run watch
```

### Configuration with Claude Desktop

Add this server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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
        "FM_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available Tools

### Authentication

- **fm_login**: Authenticate with FileMaker Server and get a session token
  - Parameters: `database` (optional), `username` (optional), `password` (optional)

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

## Example Workflow with Claude

1. **Authenticate**:

   ```text
   Use fm_login to connect to the FileMaker database
   ```

2. **Explore the Database**:

   ```text
   Use fm_get_layouts to see available layouts
   Use fm_get_layout_metadata with layout "Contacts" to see the fields
   ```

3. **Query Records**:

   ```text
   Use fm_get_records with layout "Contacts" to get all contacts
   Use fm_find_records to search for specific records
   ```

4. **Modify Data**:

   ```text
   Use fm_create_record to add a new contact
   Use fm_edit_record to update an existing contact
   Use fm_delete_record to remove a contact
   ```

5. **Clean Up**:

   ```text
   Use fm_logout to end the session
   ```

## Test Configuration

The included `DataAPI.postman_collection.json` contains test data with the following configuration:

- **Server**: 192.168.0.24
- **Version**: vLatest
- **Database**: Contacts (example)
- **User**: admin
- **Password**: wakawaka

## Security Notes

- The server disables SSL certificate verification by default for development. For production, enable SSL verification by modifying the `FileMakerAPIClient` constructor.
- Store credentials securely and never commit `.env` files to version control.
- Use environment variables for sensitive configuration in production environments.

## API Response Format

All FileMaker Data API responses follow this structure:

```json
{
  "response": {
    // Response data here
  },
  "messages": [
    {
      "code": "0",
      "message": "OK"
    }
  ]
}
```

Error responses include error codes and messages in the `messages` array.

## Troubleshooting

- **Connection errors**: Verify FM_SERVER is accessible and FileMaker Server is running
- **Authentication errors**: Check FM_USER and FM_PASSWORD are correct
- **Layout not found**: Ensure the layout name matches exactly (case-sensitive)
- **Session expired**: Call fm_login again to create a new session

## Development

To contribute or modify:

1. Edit TypeScript files in `src/`
2. Build with `npm run build`
3. Test with your FileMaker Server

## License

MIT

## Resources

- [FileMaker Data API Guide](https://help.claris.com/en/data-api-guide/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
