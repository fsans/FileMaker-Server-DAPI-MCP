# Changelog

## Version 1.0.3 - FileMaker Server 2025 Compatible

### Updated to FileMaker Data API v1.0.3

This version has been updated to match the official FileMaker Data API specification version 1.0.3, ensuring full compatibility with FileMaker Server 2025.

### New Features

#### 1. Script Execution

- **Tool**: `fm_execute_script`
- **Description**: Execute FileMaker scripts directly from layouts
- **Parameters**:
  - `layout` (required): Layout name
  - `scriptName` (required): Name of the script to execute
  - `scriptParameter` (optional): Parameter to pass to the script
  - `database` (optional): Database name
- **Example**:

  ```json
  {
    "layout": "Contacts",
    "scriptName": "UpdateRecords",
    "scriptParameter": "param1"
  }
  ```

#### 2. Container Field Upload with Repetitions

- **Tool**: `fm_upload_to_container_repetition`
- **Description**: Upload files to container fields that support repetitions
- **Parameters**:
  - `layout` (required): Layout name
  - `recordId` (required): Record ID
  - `containerFieldName` (required): Name of the container field
  - `repetition` (required): Repetition number (1-based index)
  - `filePath` (required): Path to the file to upload
  - `database` (optional): Database name
- **Example**:

  ```json
  {
    "layout": "Documents",
    "recordId": "123",
    "containerFieldName": "Files",
    "repetition": 2,
    "filePath": "/path/to/file.pdf"
  }
  ```

### API Coverage

The MCP server now implements **20 tools** covering all major FileMaker Data API endpoints:

#### Authentication (3 tools)

- fm_login
- fm_logout
- fm_validate_session

#### Metadata (5 tools)

- fm_get_product_info
- fm_get_databases
- fm_get_layouts
- fm_get_scripts
- fm_get_layout_metadata

#### Records (7 tools)

- fm_get_records
- fm_get_record_by_id
- fm_create_record
- fm_edit_record
- fm_delete_record
- fm_duplicate_record
- fm_find_records

#### Container Fields (2 tools)

- fm_upload_to_container
- fm_upload_to_container_repetition ✨ **NEW**

#### Global Fields (1 tool)

- fm_set_global_fields

#### Scripts (1 tool)

- fm_execute_script ✨ **NEW**

### Technical Details

#### API Client Methods Added

```typescript
// Execute FileMaker scripts
async executeScript(
  layout: string,
  scriptName: string,
  scriptParameter?: string,
  database?: string
): Promise<any>

// Upload to container fields with repetition
async uploadToContainerWithRepetition(
  layout: string,
  recordId: string | number,
  containerFieldName: string,
  repetition: number,
  filePath: string,
  database?: string
): Promise<any>
```

### Compatibility

- **FileMaker Server**: 2025
- **FileMaker Data API**: v1.0.3
- **Node.js**: v18 or higher
- **TypeScript**: v5.7.3

### Migration Notes

This is a backward-compatible update. All existing tools continue to work as before. The new tools are additions that don't affect existing functionality.

### Testing Recommendations

When upgrading to this version, test:

1. **Script Execution**: Verify scripts run correctly with and without parameters
2. **Container Repetitions**: Test file uploads to repeating container fields
3. **Existing Functionality**: Ensure all previous tools still work as expected

### Known Limitations

- Script execution requires the script to be accessible from the specified layout
- Container field repetitions must exist in the field definition
- Script parameters are passed as strings and must be parsed within the FileMaker script if complex data structures are needed

### Future Enhancements

Potential features for future versions:

- Script execution with pre-sort and pre-request scripts
- Enhanced error handling for script results
- Support for portal record operations via scripts
- Batch operations for multiple records
