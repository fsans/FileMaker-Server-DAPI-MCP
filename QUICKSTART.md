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

This compiles TypeScript to JavaScript in the `dist/` directory.

## 2. Test the Server (Optional)

### Test with Stdio (Default - Local)
```bash
npm run start
```

To stop testing, press `Ctrl+C`.

### Test with HTTP (Network)

**Build and start HTTP server:**
```bash
npm run build
MCP_TRANSPORT=http npm run start
```

**In another terminal, verify it's working:**
```bash
# Health check
curl http://localhost:3000/health

# Server info
curl http://localhost:3000/mcp

# Test MCP endpoint
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"test"}'
```

**Expected responses:**
- Health: `{"status":"ok","transport":"http"}`
- Info: `{"info":"FileMaker Data API MCP Server","transport":"http","methods":["POST"],"endpoint":"/mcp"}`
- MCP: `{"status":"ok","message":"MCP request received","request":{"method":"test"}}`

### Test with HTTPS (Secure Network)

**Generate self-signed certificate (development only):**
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

**Start HTTPS server:**
```bash
npm run build
MCP_TRANSPORT=https MCP_CERT_PATH=./cert.pem MCP_KEY_PATH=./key.pem npm run start
```

**Test HTTPS endpoint:**
```bash
# Skip certificate verification for self-signed certs
curl -k https://localhost:3443/health
```

## 3. Production Deployment (HTTP/HTTPS)

For network deployment, configure environment variables and start with your chosen transport:

**HTTP (Development/Testing):**
```bash
npm run build
MCP_TRANSPORT=http MCP_HOST=0.0.0.0 MCP_PORT=3000 npm run start
```

**HTTPS (Production):**
```bash
npm run build
MCP_TRANSPORT=https \
  MCP_HOST=0.0.0.0 \
  MCP_PORT=3443 \
  MCP_CERT_PATH=/etc/ssl/certs/your-cert.pem \
  MCP_KEY_PATH=/etc/ssl/private/your-key.pem \
  npm run start
```

See [NETWORK_TRANSPORT.md](NETWORK_TRANSPORT.md) for detailed network configuration and Docker deployment.

## 4. Configure Claude Desktop

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

## 5. Restart Claude Desktop

After saving the configuration, completely quit and restart Claude Desktop.

## 6. Verify Installation

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
