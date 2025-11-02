# API Reference - FileMaker Data API MCP Tools

Complete reference for all 29 MCP tools available in the FileMaker Data API MCP Server.

## Tool Categories

- [Authentication](#authentication-3-tools)
- [Metadata](#metadata-5-tools)
- [Records](#records-7-tools)
- [Container Fields](#container-fields-2-tools)
- [Global Fields](#global-fields-1-tool)
- [Scripts](#scripts-1-tool)
- [Connection Management](#connection-management-9-tools)

---

## Authentication (3 tools)

### fm_login

Authenticate with FileMaker Server and establish a session.

**Parameters:**
- `database` (optional) - Database name (uses current connection if not specified)
- `username` (optional) - Username (uses current connection if not specified)
- `password` (optional) - Password (uses current connection if not specified)
- `fmDataSource` (optional) - External database credentials array

**Returns:** Session token

**Example:**
```json
{
  "database": "Sales",
  "username": "admin",
  "password": "secret"
}
```

### fm_logout

End the current FileMaker Server session.

**Parameters:** None

**Returns:** Success confirmation

### fm_validate_session

Check if the current session token is valid.

**Parameters:** None

**Returns:** Session validity status

---

## Metadata (5 tools)

### fm_get_product_info

Get FileMaker Server product information.

**Parameters:** None

**Returns:** Server version, API version, date/time formats

### fm_get_databases

List all available databases on the FileMaker Server.

**Parameters:** None

**Returns:** Array of database names

### fm_get_layouts

Get all layouts for a database.

**Parameters:**
- `database` (optional) - Database name (uses current connection if not specified)

**Returns:** Array of layout names

### fm_get_scripts

Get all scripts for a database.

**Parameters:**
- `database` (optional) - Database name (uses current connection if not specified)

**Returns:** Array of script names

### fm_get_layout_metadata

Get detailed metadata for a specific layout including fields, portals, and value lists.

**Parameters:**
- `layout` (required) - Layout name
- `database` (optional) - Database name

**Returns:** Layout metadata including field definitions

---

## Records (7 tools)

### fm_get_records

Get records from a layout with pagination.

**Parameters:**
- `layout` (required) - Layout name
- `offset` (optional, default: 1) - Starting record number
- `limit` (optional, default: 20) - Number of records to return
- `database` (optional) - Database name

**Returns:** Array of records with field data

**Example:**
```json
{
  "layout": "Contacts",
  "offset": 1,
  "limit": 50
}
```

### fm_get_record_by_id

Get a single record by its recordId.

**Parameters:**
- `layout` (required) - Layout name
- `recordId` (required) - Record ID
- `database` (optional) - Database name

**Returns:** Single record with field data

### fm_create_record

Create a new record.

**Parameters:**
- `layout` (required) - Layout name
- `fieldData` (required) - Object with field names and values
- `database` (optional) - Database name

**Returns:** New record ID

**Example:**
```json
{
  "layout": "Contacts",
  "fieldData": {
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john@example.com"
  }
}
```

### fm_edit_record

Edit an existing record.

**Parameters:**
- `layout` (required) - Layout name
- `recordId` (required) - Record ID
- `fieldData` (required) - Object with field names and new values
- `database` (optional) - Database name

**Returns:** Modified record ID

### fm_delete_record

Delete a record.

**Parameters:**
- `layout` (required) - Layout name
- `recordId` (required) - Record ID
- `database` (optional) - Database name

**Returns:** Success confirmation

### fm_duplicate_record

Duplicate an existing record.

**Parameters:**
- `layout` (required) - Layout name
- `recordId` (required) - Record ID to duplicate
- `database` (optional) - Database name

**Returns:** New record ID

### fm_find_records

Find records using a query.

**Parameters:**
- `layout` (required) - Layout name
- `query` (required) - Array of query objects
- `offset` (optional) - Starting record number
- `limit` (optional) - Number of records to return
- `database` (optional) - Database name

**Returns:** Array of matching records

**Example:**
```json
{
  "layout": "Contacts",
  "query": [
    {
      "FirstName": "John",
      "LastName": "Doe"
    }
  ],
  "limit": 100
}
```

---

## Container Fields (2 tools)

### fm_upload_to_container

Upload a file to a container field.

**Parameters:**
- `layout` (required) - Layout name
- `recordId` (required) - Record ID
- `containerFieldName` (required) - Name of the container field
- `filePath` (required) - Path to the file to upload
- `database` (optional) - Database name

**Returns:** Success confirmation

### fm_upload_to_container_repetition

Upload a file to a container field with repetition support.

**Parameters:**
- `layout` (required) - Layout name
- `recordId` (required) - Record ID
- `containerFieldName` (required) - Name of the container field
- `repetition` (required) - Repetition number (1-based index)
- `filePath` (required) - Path to the file to upload
- `database` (optional) - Database name

**Returns:** Success confirmation

**Example:**
```json
{
  "layout": "Documents",
  "recordId": "123",
  "containerFieldName": "Files",
  "repetition": 2,
  "filePath": "/path/to/document.pdf"
}
```

---

## Global Fields (1 tool)

### fm_set_global_fields

Set global field values.

**Parameters:**
- `globalFields` (required) - Object with global field names and values
- `database` (optional) - Database name

**Returns:** Success confirmation

**Example:**
```json
{
  "globalFields": {
    "g_CurrentUser": "admin",
    "g_CurrentDate": "2025-11-02"
  }
}
```

---

## Scripts (1 tool)

### fm_execute_script

Execute a FileMaker script.

**Parameters:**
- `layout` (required) - Layout name
- `scriptName` (required) - Name of the script to execute
- `scriptParameter` (optional) - Parameter to pass to the script
- `database` (optional) - Database name

**Returns:** Script result

**Example:**
```json
{
  "layout": "Contacts",
  "scriptName": "UpdateRecords",
  "scriptParameter": "param1"
}
```

---

## Connection Management (9 tools)

### fm_config_add_connection

Add a new predefined connection.

**Parameters:**
- `name` (required) - Connection name
- `server` (required) - FileMaker Server IP/hostname
- `database` (required) - Database name
- `user` (required) - Username
- `password` (required) - Password
- `version` (optional, default: "vLatest") - API version

**Returns:** Success confirmation

### fm_config_remove_connection

Remove a predefined connection.

**Parameters:**
- `name` (required) - Connection name to remove

**Returns:** Success confirmation

### fm_config_list_connections

List all predefined connections.

**Parameters:** None

**Returns:** Array of connection objects (passwords masked)

### fm_config_get_connection

Get details for a specific connection.

**Parameters:**
- `name` (required) - Connection name

**Returns:** Connection details (password masked)

### fm_config_set_default_connection

Set the default connection.

**Parameters:**
- `name` (required) - Connection name to set as default

**Returns:** Success confirmation

### fm_set_connection

Switch to a predefined connection.

**Parameters:**
- `connectionName` (required) - Name of the connection to switch to

**Returns:** Success confirmation

**Example:**
```json
{
  "connectionName": "production"
}
```

### fm_connect

Connect with inline credentials (ad-hoc connection).

**Parameters:**
- `server` (required) - FileMaker Server IP/hostname
- `database` (required) - Database name
- `user` (required) - Username
- `password` (required) - Password
- `version` (optional, default: "vLatest") - API version

**Returns:** Success confirmation

**Example:**
```json
{
  "server": "192.168.0.26",
  "database": "TestDB",
  "user": "admin",
  "password": "test123"
}
```

### fm_list_connections

List all available connections.

**Parameters:** None

**Returns:** Array of all connections with current/default indicators

### fm_get_current_connection

Get the current active connection.

**Parameters:** None

**Returns:** Current connection details (password masked)

---

## Common Error Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 105 | Layout not found |
| 401 | Record not found |
| 802 | Unable to open file |
| 952 | Invalid username/password or invalid token |

---

## Usage Notes

### Database Parameter

Most tools accept an optional `database` parameter. If not provided:
1. Uses the current connection's database
2. Falls back to environment variable `FM_DATABASE`

### Session Management

- Call `fm_login` before using data access tools
- Sessions expire after inactivity (server-configurable)
- Call `fm_validate_session` to check session status
- Call `fm_logout` when done to free server resources

### Connection Switching

When switching connections:
1. Previous session is automatically logged out
2. New connection becomes active
3. Must call `fm_login` with new connection

---

For usage examples, see the [User Guide](user-guide.md).
