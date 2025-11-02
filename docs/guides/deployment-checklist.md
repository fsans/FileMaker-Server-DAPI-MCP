# FileMaker Data API MCP - Deployment Checklist

Use this checklist to ensure everything is properly configured before deploying to production or Claude Desktop.

## Pre-Deployment Checklist

### Phase 1: Initial Setup

- [ ] **Node.js Installed**
  - Run: `node --version`
  - Expected: v18 or higher
  - If missing: Download from https://nodejs.org/

- [ ] **npm Installed**
  - Run: `npm --version`
  - Expected: v8 or higher (comes with Node.js)

- [ ] **Project Files Present**
  - [ ] `package.json` exists
  - [ ] `src/index.ts` exists
  - [ ] `tsconfig.json` exists
  - [ ] `.env.example` exists

- [ ] **Dependencies Installed**
  - Run: `npm install`
  - Check: `ls node_modules` shows packages
  - Expected size: ~51 MB

### Phase 2: Build Verification

- [ ] **TypeScript Compilation**
  - Run: `npm run build`
  - Expected output: Shows no errors
  - Expected files: `dist/index.js`, `dist/index.d.ts`

- [ ] **Build Artifacts Verified**
  - [ ] `dist/index.js` exists and is > 20 KB
  - [ ] `dist/index.d.ts` exists
  - [ ] `dist/index.js.map` exists (source maps)
  - Run: `ls -la dist/`

- [ ] **Tools Compiled**
  - Run: `grep -c '"name": "fm_' dist/index.js` (should show ~20)
  - Or manually check tools are present

- [ ] **No Typescript Errors**
  - Run build again to confirm: `npm run build`
  - Expected: Clean exit, no error messages

### Phase 3: Configuration

- [ ] **Environment File Created**
  - [ ] Copy template: `cp .env.example .env`
  - [ ] File exists: `[ -f .env ] && echo "OK"`

- [ ] **Required Variables Set**
  - [ ] `FM_SERVER` - FileMaker Server IP/hostname
  - [ ] `FM_VERSION` - API version (typically `vLatest`)
  - [ ] `FM_DATABASE` - Default database name
  - [ ] `FM_USER` - FileMaker admin username
  - [ ] `FM_PASSWORD` - FileMaker admin password

  Verification script:
  ```bash
  source .env && \
  echo "FM_SERVER=$FM_SERVER" && \
  echo "FM_DATABASE=$FM_DATABASE" && \
  echo "FM_USER=$FM_USER" && \
  echo "FM_VERSION=$FM_VERSION"
  ```

- [ ] **Credentials Validated**
  - Test credentials work in FileMaker Pro or Go
  - Account has Data API access enabled
  - Account has access to all required databases

- [ ] **Network Connectivity**
  - Run: `ping $FM_SERVER` (replace with your server)
  - Expected: Response received, no timeout
  - FileMaker Server is running and accessible

### Phase 4: Local Testing

- [ ] **Server Starts**
  - Run: `npm start`
  - Expected output: `FileMaker Data API MCP Server running on stdio`
  - Press Ctrl+C to stop

- [ ] **No Startup Errors**
  - Check for error messages related to:
    - Missing environment variables
    - Connection failures
    - File permission issues

- [ ] **Configuration Validation Script**
  - Run: `./validate-config.sh`
  - Check: No FAIL markers
  - Address any WARN markers before production

### Phase 5: Security & Credentials

- [ ] **Git Ignore Configured**
  - Check: `.gitignore` contains `.env`
  - Run: `grep ".env" .gitignore`
  - Purpose: Prevent credentials from being committed

- [ ] **File Permissions Correct**
  - `.env` should NOT be readable by others
  - Run: `chmod 600 .env`
  - Check: `ls -la .env` shows `-rw-------`

- [ ] **No Hardcoded Credentials**
  - Search: `grep -r "password\|admin\|secret" src/`
  - Expected: Only references to environment variables
  - Found credentials: Remove and use env vars

- [ ] **Credentials Not Logged**
  - Check logs don't contain passwords
  - Run: `npm start 2>&1 | grep -i password`
  - Expected: No output

### Phase 6: Documentation Review

- [ ] **README.md**
  - [ ] Exists and is readable
  - [ ] Contains setup instructions
  - [ ] Lists all available tools

- [ ] **QUICKSTART.md**
  - [ ] Contains 5-minute setup guide
  - [ ] Has troubleshooting section
  - [ ] Explains FileMaker error codes

- [ ] **DEPLOYMENT_AND_TESTING.md**
  - [ ] Comprehensive deployment guide
  - [ ] Environment-specific configs (dev/staging/prod)
  - [ ] Troubleshooting section

- [ ] **QUICK_REFERENCE.md**
  - [ ] Cheat sheet available
  - [ ] Tool quick reference
  - [ ] Commands readily available

- [ ] **CHANGELOG.md**
  - [ ] Version history documented
  - [ ] Known limitations listed
  - [ ] Features documented

### Phase 7: Claude Desktop Integration (macOS)

- [ ] **Configuration File Located**
  - Path: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Exists: `[ -f ~/Library/Application\ Support/Claude/claude_desktop_config.json ] && echo "OK"`

- [ ] **Absolute Path Prepared**
  - From project directory run: `pwd`
  - Copy the output (this is your absolute path)
  - Note: `/Users/username/Desktop/FMDAPI-MCP`

- [ ] **Configuration Added to Claude Desktop**
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

- [ ] **Configuration File Syntax Valid**
  - Run: `python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json > /dev/null && echo "Valid"`
  - Expected: "Valid" output
  - If error: Fix JSON formatting

- [ ] **Claude Desktop Restarted**
  - Quit Claude Desktop completely
  - Wait 5 seconds
  - Reopen Claude Desktop
  - Check: MCP tools appear in Claude

### Phase 7b: Claude Desktop Integration (Windows)

- [ ] **Configuration File Located**
  - Path: `%APPDATA%\Claude\claude_desktop_config.json`
  - Check in File Explorer: Right-click → Properties

- [ ] **Absolute Path Prepared**
  - Example: `C:\Users\YourUsername\Desktop\FMDAPI-MCP`
  - Use backslashes: `\\` in JSON strings

- [ ] **Configuration Added**
  ```json
  {
    "mcpServers": {
      "filemaker": {
        "command": "node",
        "args": ["C:\\Users\\YourUsername\\Desktop\\FMDAPI-MCP\\dist\\index.js"],
        "env": { ... }
      }
    }
  }
  ```

- [ ] **Claude Desktop Restarted**
  - Close Claude Desktop
  - Wait 5 seconds
  - Reopen

### Phase 8: Functionality Testing

- [ ] **Tools Available**
  - In Claude, ask: "What tools do you have available?"
  - Expected: Should list `fm_login`, `fm_logout`, etc.

- [ ] **Authentication Works**
  - Ask Claude: "Connect to the FileMaker database"
  - Expected: Successful login response

- [ ] **Metadata Accessible**
  - Ask Claude: "List the databases"
  - Expected: Returns list of databases from FileMaker

- [ ] **Record Operations Work**
  - Ask Claude: "Show me the first 5 contacts"
  - Expected: Returns actual records from FileMaker

- [ ] **Error Handling Works**
  - Ask Claude: "Get records from a non-existent layout"
  - Expected: Proper error message (not crash)

### Phase 9: Performance Check

- [ ] **Server Response Time**
  - Operations complete in < 5 seconds
  - No timeout errors
  - Network latency acceptable

- [ ] **Memory Usage**
  - Monitor: `top` (macOS) or Task Manager (Windows)
  - Expected: < 200 MB RAM usage
  - No memory leaks over time

- [ ] **Large Record Sets**
  - Test: `fm_get_records` with `limit: 100`
  - Expected: Completes without timeout
  - Pagination works correctly

### Phase 10: Production Readiness

- [ ] **Staging Environment**
  - Created separate `.env` for staging
  - Tested against staging FileMaker Server
  - All operations verified

- [ ] **Backup Created**
  - .env backed up securely
  - Configuration documented
  - Credentials stored in secure vault

- [ ] **Monitoring Planned**
  - Error logging configured
  - Performance monitoring planned
  - Update strategy defined

- [ ] **Documentation Complete**
  - All guides updated
  - Troubleshooting covers known issues
  - Team trained on usage

## Post-Deployment Checklist

- [ ] **Monitor First 24 Hours**
  - Check logs for errors
  - Verify connections are stable
  - Monitor performance metrics

- [ ] **User Feedback Collected**
  - Team can access FileMaker through Claude
  - No unexpected errors reported
  - Performance is acceptable

- [ ] **Credentials Rotated**
  - After successful deployment
  - First use requires password change
  - New password stored securely

- [ ] **Backup Tested**
  - Ensure configuration can be restored
  - Document recovery procedure
  - Test restore process

- [ ] **Documentation Updated**
  - Add production server details
  - Update troubleshooting with lessons learned
  - Share deployment guide with team

## Validation Script

Run the automated validation:

```bash
./validate-config.sh
```

This script checks:
- Node.js version
- Dependencies installed
- Build output present
- Configuration complete
- Network connectivity
- Tool definitions compiled
- Documentation files present

Expected output: All checks pass with green ✓

## Rollback Plan

If issues occur after deployment:

1. **Stop Claude Desktop/Server**
   - Close the application
   - Stop the MCP server process

2. **Revert Configuration**
   - Restore previous `.env` file from backup
   - Restore previous `dist/index.js`

3. **Rebuild if Needed**
   - Run: `npm run build`
   - Run: `npm start`

4. **Test Before Re-enabling**
   - Verify all functions work
   - Check error logs
   - Confirm stable state

5. **Contact Support if Needed**
   - FileMaker Server issues: Check FM admin console
   - MCP Protocol issues: Review logs in debug mode
   - Configuration issues: Review env variables

## Common Issues & Solutions

| Issue | Solution | Time |
|-------|----------|------|
| Build fails | `npm run build` | 1 min |
| Server won't start | Check .env file exists | 2 min |
| Can't connect to FM | Verify FM_SERVER is correct, ping it | 5 min |
| Authentication fails | Check credentials in FileMaker Pro | 10 min |
| Tools not appearing | Restart Claude Desktop, check config | 2 min |
| Slow performance | Check network, reduce limit parameter | 10 min |

## Support Contacts

- **Technical Issues**: Check DEPLOYMENT_AND_TESTING.md troubleshooting
- **FileMaker Questions**: Claris support portal
- **MCP Protocol**: https://modelcontextprotocol.io/docs
- **Node.js Issues**: https://nodejs.org/en/docs/

---

**Deployment Sign-Off**

- [ ] I have completed all checklist items
- [ ] All tests have passed
- [ ] Security review is complete
- [ ] Documentation is updated
- [ ] Team is trained
- [ ] Deployment is approved

**Deployed By**: ___________________
**Date**: ___________________
**Notes**: ___________________

