# FileMaker Data API MCP Server - Quick Start Guide

## 1. Initial Setup (5 minutes)

### Step 1: Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your FileMaker Server details
# Replace the values with your actual server information
```

Your `.env` should look like this:
```env
FM_SERVER=192.168.0.24
FM_VERSION=vLatest
FM_DATABASE=Contacts
FM_USER=admin
FM_PASSWORD=your_password
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Project
```bash
npm run build
```

## 2. Test the Server (Optional)

You can test the server manually:
```bash
npm start
```

To stop testing, press `Ctrl+C`.

## 3. Configure Claude Desktop

### macOS
Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Edit: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration (replace `/absolute/path/to/` with your actual path):
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

**Important**: Use the absolute path to the `dist/index.js` file!

## 4. Restart Claude Desktop

After saving the configuration, completely quit and restart Claude Desktop.

## 5. Verify Installation

In Claude Desktop, try these commands:

1. **Check Available Tools**:
   ```
   Can you list the FileMaker tools available?
   ```

2. **Test Connection**:
   ```
   Use fm_login to connect to FileMaker
   ```

3. **Explore Database**:
   ```
   Use fm_get_databases to list available databases
   ```

## Common First Tasks

### View Databases
```
Use fm_login first, then fm_get_databases to see available databases
```

### Explore a Database Structure
```
Use fm_get_layouts to see all layouts in the database
Use fm_get_layout_metadata with layout "YourLayoutName" to see fields
```

### Query Records
```
Use fm_get_records with layout "YourLayoutName" to get records
```

### Search for Specific Data
```
Use fm_find_records with a query like [{"FirstName": "John"}]
```

### Create a New Record
```
Use fm_create_record with layout "YourLayoutName" and fieldData {"field1": "value1"}
```

## Troubleshooting

### "Connection refused" or "Cannot connect"
- Verify FM_SERVER is correct and accessible
- Ensure FileMaker Server is running
- Check firewall settings

### "Authentication failed" (error code 952)
- Verify FM_USER and FM_PASSWORD are correct
- Check user has proper privileges in FileMaker

### "Layout not found" (error code 105)
- Layout names are case-sensitive
- Use fm_get_layouts to see exact layout names

### "No active session" or "Invalid token" (error code 952)
- Call fm_login first to establish a session
- Session may have expired - login again

### Tools not showing in Claude Desktop
- Verify the path in claude_desktop_config.json is absolute
- Check the path exists: `ls /path/to/FMDAPI-MCP/dist/index.js`
- Restart Claude Desktop completely
- Check Claude Desktop logs for errors

## FileMaker Error Codes Reference

- **0**: OK (Success)
- **105**: Layout not found
- **401**: Record not found
- **802**: Unable to open file
- **952**: Invalid username or password / Invalid token

## Next Steps

Once connected successfully:
1. Explore your database structure with metadata tools
2. Query and manipulate records
3. Use find operations for complex searches
4. Upload files to container fields
5. Set global field values

For detailed information, see [README.md](README.md)
