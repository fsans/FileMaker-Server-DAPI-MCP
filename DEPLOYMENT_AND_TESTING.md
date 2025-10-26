# FileMaker Data API MCP Server - Deployment & Testing Guide

This guide covers testing, configuration, and deployment of the FileMaker Data API MCP server.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Testing](#testing)
4. [Deployment](#deployment)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js v18 or higher
- FileMaker Server 2025 with Data API enabled
- Valid FileMaker Server credentials
- npm (included with Node.js)

### Setup (5 minutes)

```bash
# 1. Navigate to the project directory
cd /path/to/FMDAPI-MCP

# 2. Install dependencies (skip if already done)
npm install

# 3. Create environment configuration
cp .env.example .env

# 4. Edit .env with your FileMaker Server details
# Use your favorite editor: nano, vim, code, etc.
nano .env

# 5. Build the project
npm run build

# 6. Test the server
npm start
```

You should see:
```
FileMaker Data API MCP Server running on stdio
```

Press `Ctrl+C` to stop the server.

---

## Configuration

### Environment Variables (.env)

Create a `.env` file in the project root with the following variables:

```env
# FileMaker Server hostname or IP address (WITHOUT https://)
FM_SERVER=192.168.0.24

# FileMaker Data API version
# Options: vLatest, v1, v2, etc.
FM_VERSION=vLatest

# Default database name (can be overridden per tool call)
FM_DATABASE=Contacts

# FileMaker Server admin username
FM_USER=admin

# FileMaker Server password
FM_PASSWORD=your_password_here
```

### Configuration Best Practices

1. **Never commit .env files** - They contain credentials
2. **Use .env.example as template** - Keep example file updated with dummy values
3. **Different environments** - Use separate credentials for dev/staging/production
4. **Rotate credentials** - Change passwords periodically
5. **Restrict access** - Use least-privilege FileMaker accounts

### Testing Different Configurations

You can override environment variables at runtime:

```bash
# Test with different server
FM_SERVER=staging.example.com FM_DATABASE=TestDB npm start

# Using a different API version
FM_VERSION=v1 npm start

# With different credentials
FM_USER=readonly FM_PASSWORD=readpass npm start
```

---

## Testing

### 1. Build Verification

Verify the TypeScript compiles without errors:

```bash
npm run build
```

Expected output:
```
> filemaker-data-api-mcp@1.0.0 build
> tsc
```

If you see any errors, fix them before proceeding.

### 2. Server Startup Test

Test that the server can start:

```bash
npm start
```

The server should output:
```
FileMaker Data API MCP Server running on stdio
```

If it fails, check:
- Node.js version: `node --version` (should be v18+)
- Dependencies: `npm ls` (should show all installed)
- Build output: `ls dist/` (should contain index.js)

### 3. Configuration Validation

Before deploying, verify your .env configuration:

```bash
# Check that .env file exists
[ -f .env ] && echo ".env file found" || echo "ERROR: .env file missing"

# Verify required variables are set
grep -E "^(FM_SERVER|FM_DATABASE|FM_USER|FM_PASSWORD)" .env
```

All four variables should be present with non-empty values.

### 4. Tool Verification

Verify all 20 tools are properly loaded by checking the compiled code:

```bash
# Count tool definitions (should show 20)
grep -c '"name": "fm_' dist/index.js || grep '"name":' dist/index.js | head -20
```

Expected tools:
- 3 authentication tools (fm_login, fm_logout, fm_validate_session)
- 5 metadata tools (fm_get_product_info, fm_get_databases, fm_get_layouts, fm_get_scripts, fm_get_layout_metadata)
- 7 record tools (fm_get_records, fm_get_record_by_id, fm_create_record, fm_edit_record, fm_delete_record, fm_duplicate_record, fm_find_records)
- 2 container tools (fm_upload_to_container, fm_upload_to_container_repetition)
- 1 global field tool (fm_set_global_fields)
- 1 script tool (fm_execute_script)
- 1 validation tool (fm_validate_session)

**Total: 20 tools**

### 5. Postman Collection Testing

The included `DataAPI.postman_collection.json` contains pre-configured API tests:

1. Open Postman
2. Import `DataAPI.postman_collection.json`
3. Set environment variables:
   - `server`: 192.168.0.24 (your FM Server)
   - `username`: admin
   - `password`: your_password
4. Run requests in order:
   - POST /fmi/data/v1/databases/[db]/sessions (login)
   - GET /fmi/data/v1/databases (list databases)
   - GET /fmi/data/v1/databases/[db]/layouts (list layouts)
   - GET /fmi/data/v1/databases/[db]/layouts/[layout]/records (get records)

### 6. Development Testing

For active development and auto-reload:

```bash
npm run watch
```

This continuously compiles TypeScript as you edit `src/index.ts`.

In another terminal:
```bash
npm start
```

---

## Deployment

### Claude Desktop Integration

#### macOS

1. Open the configuration file:
   ```bash
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Add the filemaker server configuration:
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
           "FM_PASSWORD": "your_password_here"
         }
       }
     }
   }
   ```

3. Get the absolute path:
   ```bash
   # From project root
   pwd  # Copy this path
   ```

4. Replace `/absolute/path/to/FMDAPI-MCP` with the result from step 3

5. Restart Claude Desktop

#### Windows

1. Open the configuration file:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the configuration (same as macOS, but use Windows paths):
   ```json
   {
     "mcpServers": {
       "filemaker": {
         "command": "node",
         "args": ["C:\\Users\\YourUsername\\path\\to\\FMDAPI-MCP\\dist\\index.js"],
         "env": {
           "FM_SERVER": "192.168.0.24",
           "FM_VERSION": "vLatest",
           "FM_DATABASE": "Contacts",
           "FM_USER": "admin",
           "FM_PASSWORD": "your_password_here"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop

### Linux / Docker Deployment

#### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV FM_SERVER=filemaker.example.com
ENV FM_VERSION=vLatest
ENV FM_DATABASE=Contacts
ENV FM_USER=admin
ENV FM_PASSWORD=your_password

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t filemaker-mcp .
docker run -e FM_SERVER=192.168.0.24 -e FM_PASSWORD=secret filemaker-mcp
```

#### Using systemd Service (Linux)

Create `/etc/systemd/system/filemaker-mcp.service`:

```ini
[Unit]
Description=FileMaker Data API MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/filemaker-mcp
Environment="FM_SERVER=192.168.0.24"
Environment="FM_DATABASE=Contacts"
Environment="FM_USER=admin"
Environment="FM_PASSWORD=your_password"
ExecStart=/usr/bin/npm start

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable filemaker-mcp
sudo systemctl start filemaker-mcp
sudo systemctl status filemaker-mcp
```

### Environment-Specific Configurations

#### Development

```env
FM_SERVER=localhost
FM_VERSION=vLatest
FM_DATABASE=DevDB
FM_USER=dev_user
FM_PASSWORD=dev_password
```

#### Staging

```env
FM_SERVER=staging.internal.example.com
FM_VERSION=vLatest
FM_DATABASE=StagingDB
FM_USER=staging_user
FM_PASSWORD=staging_password
```

#### Production

```env
FM_SERVER=filemaker.example.com
FM_VERSION=vLatest
FM_DATABASE=ProductionDB
FM_USER=prod_service_account
FM_PASSWORD=prod_password
```

---

## Troubleshooting

### Build Issues

**Problem**: `npm run build` fails with TypeScript errors

**Solution**:
1. Check Node.js version: `node --version` (should be 18+)
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for syntax errors in `src/index.ts`

**Problem**: `npm run build` completes but `dist/index.js` is missing

**Solution**:
1. Check tsconfig.json: `grep outDir tsconfig.json`
2. Manually run TypeScript compiler: `npx tsc`
3. Check file permissions: `ls -la dist/`

### Runtime Issues

**Problem**: Server won't start with "FM_SERVER not found"

**Solution**:
1. Create .env file: `cp .env.example .env`
2. Edit .env with your settings: `nano .env`
3. Verify variables: `cat .env`

**Problem**: "Cannot connect to FileMaker Server"

**Solution**:
1. Verify FM_SERVER is reachable: `ping 192.168.0.24`
2. Check FileMaker Server is running on target machine
3. Verify Data API is enabled in FileMaker Server Admin Console
4. Check network firewall allows port 443 (HTTPS)
5. Try using hostname instead of IP: `FM_SERVER=filemaker.local`

**Problem**: "Invalid credentials" error

**Solution**:
1. Verify FM_USER and FM_PASSWORD are correct
2. Check credentials work in FileMaker Pro/Go
3. Ensure user has Data API access permissions in FileMaker Server
4. Check password doesn't contain special characters that need escaping

**Problem**: "Database not found"

**Solution**:
1. Verify FM_DATABASE name matches exactly (case-sensitive)
2. List available databases: `fm_get_databases` tool
3. Check database is open on FileMaker Server
4. Verify account has access to the database

**Problem**: Claude Desktop can't find the server

**Solution**:
1. Verify absolute path in config is correct: `ls -la /path/to/dist/index.js`
2. Check node is in PATH: `which node`
3. Restart Claude Desktop completely
4. Check Claude logs: `~/Library/Logs/Claude/` (macOS)
5. Rebuild: `npm run build`

### Permission Issues

**Problem**: Permission denied when running `npm start`

**Solution**:
```bash
# Fix permissions
chmod +x dist/index.js
chmod +x node_modules/.bin/*

# Or run with sudo (not recommended)
sudo npm start
```

**Problem**: Can't write to .env file

**Solution**:
```bash
# Check permissions
ls -la .env.example

# Fix permissions
chmod 644 .env.example
touch .env && chmod 644 .env
```

### Network Issues

**Problem**: SSL Certificate Error

**Solution**:
- This is expected in development with self-signed certificates
- SSL verification is disabled by default in the client
- For production, enable SSL verification in `src/index.ts` line 28

**Problem**: Timeout when calling tools

**Solution**:
1. Check network connectivity: `ping FM_SERVER`
2. Increase timeout in axios config (src/index.ts line ~31)
3. Check FileMaker Server is responsive: use Postman to test
4. Look for firewall rules blocking the connection

### Debugging

Enable verbose logging:

```bash
# Show all axios requests/responses
DEBUG=* npm start

# Show only FileMaker requests
DEBUG=axios npm start
```

Check error logs:

```bash
# Last 20 lines
npm start 2>&1 | tail -20

# Pipe to file for analysis
npm start 2>&1 | tee debug.log
```

---

## Verification Checklist

Before deployment, verify:

- [ ] `npm run build` completes without errors
- [ ] `npm start` runs and shows "FileMaker Data API MCP Server running on stdio"
- [ ] `.env` file exists with all required variables
- [ ] Environment variables match your FileMaker Server configuration
- [ ] FileMaker Server is running and Data API is enabled
- [ ] Network connectivity to FileMaker Server confirmed
- [ ] Credentials are valid and have appropriate permissions
- [ ] 20 tools are compiled into `dist/index.js`
- [ ] Claude Desktop configuration added (if deploying to Claude)
- [ ] Absolute paths in Claude config are correct
- [ ] Claude Desktop has been restarted after configuration change

---

## Performance Considerations

- **Pagination**: Use `offset` and `limit` parameters to retrieve large record sets efficiently
- **Caching**: Consider caching layout metadata between calls
- **Connection pooling**: The client reuses HTTP connections for efficiency
- **Error handling**: Implement retry logic for transient network errors

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use strong passwords** for FileMaker accounts
3. **Restrict account permissions** to only necessary databases/layouts
4. **Disable SSL verification only in development** - enable for production
5. **Use HTTPS** when FileMaker Server is exposed over untrusted networks
6. **Rotate credentials** regularly
7. **Monitor access logs** in FileMaker Server
8. **Keep Node.js updated** for security patches

---

## Support

For issues:

1. Check the [FileMaker Data API Documentation](https://help.claris.com/en/data-api-guide/)
2. Review the [MCP Documentation](https://modelcontextprotocol.io/)
3. Check troubleshooting section above
4. Examine server logs with DEBUG mode
5. Test with Postman collection first to isolate issues

