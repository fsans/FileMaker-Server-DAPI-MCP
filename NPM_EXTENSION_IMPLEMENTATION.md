# npm Extension Implementation Guide

## Status: Phase 1 Complete ✅

### Phase 1: Package Structure Preparation - COMPLETED

#### 1.1 Updated package.json ✅
- Added `bin` field: `"filemaker-mcp": "dist/bin/cli.js"`
- Added `files` field to control npm publish scope
- Added `prepublishOnly` script to auto-build before publish
- Added repository, bugs, homepage fields
- Added Node.js engine requirement (>=18.0.0)
- Added `commander` dependency for CLI parsing

**File**: `/Users/fsans/Desktop/FMDAPI-MCP/package.json`

#### 1.2 Created CLI Entry Point ✅
**File**: `/Users/fsans/Desktop/FMDAPI-MCP/src/bin/cli.ts`

**Features**:
- `filemaker-mcp setup` - Interactive configuration wizard
- `filemaker-mcp start` - Start the MCP server with loaded config
- `filemaker-mcp configure-claude` - Auto-configure Claude Desktop
- `filemaker-mcp config` - Display current configuration

**Commands**:
```bash
filemaker-mcp setup                 # Interactive setup
filemaker-mcp start                 # Start server
filemaker-mcp configure-claude      # Configure Claude Desktop
filemaker-mcp config                # Show config
filemaker-mcp --help                # Show help
filemaker-mcp --version             # Show version
```

#### 1.3 Created Configuration Module ✅
**File**: `/Users/fsans/Desktop/FMDAPI-MCP/src/config.ts`

**Exports**:
- `AppConfig` - Type definition for configuration
- `loadConfigFile()` - Load from ~/.filemaker-mcp/config.json
- `saveConfigFile()` - Save to ~/.filemaker-mcp/config.json
- `loadEnvFile()` - Load from ~/.filemaker-mcp/.env
- `getConfig()` - Get merged config with precedence
- `validateConfig()` - Validate configuration
- `getConfigDir()` - Get config directory path
- `getConfigFilePath()` - Get config file path
- `getEnvFilePath()` - Get env file path
- `hasConfig()` - Check if config exists

**Configuration Precedence** (highest to lowest):
1. Environment variables (FM_SERVER, FM_DATABASE, etc.)
2. Config file (~/.filemaker-mcp/config.json)
3. Default values

---

## Next Steps: Phase 2 - npm Registration & Publishing

### 2.1 npm Account Setup

**Steps**:
1. Create npm account at https://www.npmjs.com/signup
2. Enable 2FA (Two-Factor Authentication) for security
3. Generate access token for CI/CD (optional)
4. Document credentials securely

**Verify Installation**:
```bash
npm whoami
```

### 2.2 GitHub Repository Setup

**Steps**:
1. Create GitHub repository: `filemaker-data-api-mcp`
2. Push code to GitHub
3. Create `.npmignore` file (if needed)
4. Set up GitHub Actions for automated testing/publishing

**Repository Structure**:
```
filemaker-data-api-mcp/
├── src/
│   ├── bin/
│   │   └── cli.ts
│   ├── config.ts
│   ├── index.ts
│   └── transport.ts
├── dist/
│   ├── bin/
│   │   └── cli.js
│   ├── config.js
│   ├── index.js
│   └── transport.js
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── .npmignore
```

### 2.3 Package Naming

**Recommendation**: `filemaker-data-api-mcp` (unscoped)

**Why**:
- Easy to remember
- Follows npm naming conventions
- No organization setup required
- Clear purpose from name

**Alternative Options**:
- `@filemaker/mcp-server` (requires organization)
- `@yourusername/filemaker-mcp` (personal scope)

### 2.4 npm Package Metadata

**Required Files**:
- ✅ `package.json` - Complete with all fields
- ⏳ `README.md` - Installation & usage guide
- ⏳ `LICENSE` - MIT license file
- ⏳ `CHANGELOG.md` - Version history
- ⏳ `.npmignore` - Exclude unnecessary files

---

## Phase 3: Configuration & Setup (Pending)

### 3.1 Configuration File Support
**Location**: `~/.filemaker-mcp/config.json`

**Format**:
```json
{
  "server": {
    "transport": "stdio",
    "port": 3000,
    "host": "localhost"
  },
  "filemaker": {
    "server": "192.168.0.24",
    "version": "vLatest",
    "database": "Contacts",
    "user": "admin"
  },
  "security": {
    "certPath": null,
    "keyPath": null
  }
}
```

### 3.2 Setup Command Workflow
```
filemaker-mcp setup
  ↓
Interactive prompts for:
  - FileMaker Server IP/hostname
  - API Version
  - Database name
  - Username
  - Password
  - Transport type (stdio/http/https)
  - Port (if not stdio)
  - Certificates (if HTTPS)
  ↓
Save to ~/.filemaker-mcp/config.json
Save to ~/.filemaker-mcp/.env
  ↓
✅ Ready to use: filemaker-mcp start
```

---

## Phase 4: Claude Desktop Integration (Pending)

### 4.1 Installation Guide

**For macOS/Linux/Windows**:
```bash
npm install -g filemaker-data-api-mcp
filemaker-mcp setup
filemaker-mcp configure-claude
```

### 4.2 Claude Desktop Configuration

**File**: `~/.claude/claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "filemaker": {
      "command": "filemaker-mcp",
      "args": ["start"],
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

---

## Phase 5: Documentation (Pending)

### 5.1 README.md Updates
- Quick start with npm install
- Global command usage
- Configuration options
- Claude Desktop setup
- Troubleshooting

### 5.2 INSTALLATION.md
- Global installation
- Local installation for development
- Verification steps
- Troubleshooting

### 5.3 CONFIGURATION.md
- Environment variables
- Config file format
- Setup wizard usage
- Advanced options

### 5.4 PUBLISHING.md
- npm account setup
- Publishing process
- Version management
- Release checklist

---

## Phase 6: Testing & QA (Pending)

### 6.1 Build Test
```bash
npm run build
```

### 6.2 Local Installation Test
```bash
npm install -g .
filemaker-mcp --help
filemaker-mcp --version
```

### 6.3 Setup Wizard Test
```bash
filemaker-mcp setup
# Follow prompts
filemaker-mcp config
```

### 6.4 Server Start Test
```bash
filemaker-mcp start
# Should start without errors
```

### 6.5 Claude Desktop Integration Test
```bash
filemaker-mcp configure-claude
# Verify claude_desktop_config.json updated
# Restart Claude Desktop
# Check if tools appear
```

---

## Phase 7: Publishing to npm (Pending)

### 7.1 Pre-Release Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Git tag created
- [ ] Build artifacts generated

### 7.2 npm Publish

**First Time**:
```bash
npm login
npm publish
```

**Subsequent Releases**:
```bash
npm version patch  # or minor/major
npm publish
```

### 7.3 Verify Publication
```bash
npm info filemaker-data-api-mcp
npm view filemaker-data-api-mcp versions
```

### 7.4 Test Installation from Registry
```bash
npm install -g filemaker-data-api-mcp
filemaker-mcp --version
```

---

## Build & Compilation

### Current Setup
```bash
npm run build      # Compile TypeScript
npm run dev        # Build + run
npm run watch      # Watch mode
npm start          # Run compiled version
```

### Build Output
```
dist/
├── bin/
│   ├── cli.js
│   └── cli.d.ts
├── config.js
├── config.d.ts
├── index.js
├── index.d.ts
├── transport.js
└── transport.d.ts
```

---

## Environment Variables

### FileMaker Configuration
- `FM_SERVER` - FileMaker Server IP/hostname (required)
- `FM_VERSION` - API version (default: vLatest)
- `FM_DATABASE` - Default database name (required)
- `FM_USER` - FileMaker username (required)
- `FM_PASSWORD` - FileMaker password

### Transport Configuration
- `MCP_TRANSPORT` - Transport type: stdio|http|https (default: stdio)
- `MCP_HOST` - Server host (default: localhost)
- `MCP_PORT` - Server port (default: 3000)

### HTTPS Configuration
- `MCP_CERT_PATH` - Path to SSL certificate (required for HTTPS)
- `MCP_KEY_PATH` - Path to SSL key (required for HTTPS)

---

## File Structure After Phase 1

```
/Users/fsans/Desktop/FMDAPI-MCP/
├── src/
│   ├── bin/
│   │   └── cli.ts                    ✅ NEW
│   ├── config.ts                     ✅ NEW
│   ├── index.ts                      (existing)
│   └── transport.ts                  (existing)
├── dist/
│   ├── bin/
│   │   └── cli.js                    (will be generated)
│   ├── config.js                     (will be generated)
│   ├── index.js                      (existing)
│   └── transport.js                  (existing)
├── package.json                      ✅ UPDATED
├── tsconfig.json                     (existing)
├── NPM_EXTENSION_PLAN.md             ✅ NEW
├── NPM_EXTENSION_IMPLEMENTATION.md   ✅ NEW (this file)
└── ... (other existing files)
```

---

## Quick Commands Reference

### Development
```bash
npm install                    # Install dependencies
npm run build                  # Build TypeScript
npm run watch                  # Watch for changes
npm run dev                    # Build and run
npm start                      # Run compiled version
```

### CLI Usage (After Build)
```bash
node dist/bin/cli.js setup                    # Setup wizard
node dist/bin/cli.js start                    # Start server
node dist/bin/cli.js configure-claude         # Configure Claude
node dist/bin/cli.js config                   # Show config
```

### Global Usage (After npm install -g)
```bash
filemaker-mcp setup                           # Setup wizard
filemaker-mcp start                           # Start server
filemaker-mcp configure-claude                # Configure Claude
filemaker-mcp config                          # Show config
```

---

## Known Issues & Solutions

| Issue | Solution |
|-------|----------|
| `command not found: filemaker-mcp` | Run `npm install -g .` in project directory |
| Config file not found | Run `filemaker-mcp setup` first |
| HTTPS certificate error | Verify cert/key paths in config |
| Claude Desktop not detecting | Restart Claude Desktop after configure-claude |
| Port already in use | Change MCP_PORT in config |

---

## Next Actions

1. **Immediate**: Build and test Phase 1 changes
   ```bash
   npm install
   npm run build
   npm install -g .
   filemaker-mcp --help
   ```

2. **Then**: Set up npm account and GitHub repository

3. **Then**: Complete Phases 2-7 as outlined

---

## Support & References

- **MCP Protocol**: https://modelcontextprotocol.io/
- **npm Publishing**: https://docs.npmjs.com/packages-and-modules/
- **Commander.js**: https://github.com/tj/commander.js
- **TypeScript**: https://www.typescriptlang.org/
- **Claude Desktop**: https://claude.ai/

---

**Last Updated**: 2025-01-30
**Status**: Phase 1 Complete, Ready for Phase 2
