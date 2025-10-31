# FileMaker Data API MCP - npm Extension Conversion Plan

## Overview
Convert the FileMaker Data API MCP Server from a local Node.js application to a publishable npm package that can be registered and installed globally or as a dependency.

## Current State
- **Type**: Local Node.js application with TypeScript
- **Distribution**: Manual setup via git clone + npm install
- **Entry Point**: `dist/index.js` (compiled from `src/index.ts`)
- **Configuration**: Environment variables (.env file)
- **Deployment**: Direct node execution or launchd plist

## Target State
- **Type**: Published npm package (`@filemaker/mcp-server` or `filemaker-data-api-mcp`)
- **Distribution**: `npm install -g filemaker-data-api-mcp` or `npm install filemaker-data-api-mcp`
- **Entry Point**: Executable bin script
- **Configuration**: Environment variables + config file support
- **Deployment**: Global command or Claude Desktop integration

---

## Phase 1: Package Structure Preparation

### 1.1 Update package.json
**Status**: Pending

**Changes**:
```json
{
  "name": "filemaker-data-api-mcp",
  "version": "1.0.0",
  "description": "MCP server for FileMaker Data API integration",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "filemaker-mcp": "dist/bin/cli.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc && node dist/index.js",
    "watch": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "mcp",
    "filemaker",
    "data-api",
    "rest-api",
    "claude"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/filemaker-data-api-mcp"
  },
  "bugs": {
    "url": "https://github.com/yourusername/filemaker-data-api-mcp/issues"
  },
  "homepage": "https://github.com/yourusername/filemaker-data-api-mcp#readme",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Rationale**:
- `bin` field enables global CLI command
- `files` field controls what gets published
- `prepublishOnly` ensures build before publish
- `engines` specifies Node.js version requirement

### 1.2 Create CLI Entry Point
**Status**: Pending
**File**: `src/bin/cli.ts`

**Purpose**: Executable wrapper for the MCP server
- Parse command-line arguments
- Load configuration from file or environment
- Start the server with appropriate transport

### 1.3 Create Configuration Module
**Status**: Pending
**File**: `src/config.ts`

**Purpose**: Centralized configuration management
- Load from environment variables
- Load from config file (~/.filemaker-mcp/config.json)
- Merge and validate configuration
- Provide sensible defaults

---

## Phase 2: Registration & Publishing

### 2.1 npm Account Setup
**Status**: Pending

**Steps**:
1. Create npm account at https://www.npmjs.com/signup
2. Enable 2FA (Two-Factor Authentication)
3. Generate access token for CI/CD (if needed)
4. Document credentials securely

### 2.2 Package Naming & Scope
**Status**: Pending

**Options**:
- **Unscoped**: `filemaker-data-api-mcp` (public)
- **Scoped**: `@filemaker/mcp-server` (requires organization)
- **Scoped**: `@yourusername/filemaker-mcp` (personal scope)

**Recommendation**: Start with unscoped `filemaker-data-api-mcp`

### 2.3 GitHub Repository Setup
**Status**: Pending

**Steps**:
1. Create GitHub repository
2. Add `.npmignore` to exclude unnecessary files
3. Add GitHub Actions for automated testing/publishing
4. Set up branch protection rules

### 2.4 npm Package Metadata
**Status**: Pending

**Requirements**:
- [ ] README.md with installation & usage
- [ ] LICENSE file (MIT recommended)
- [ ] CHANGELOG.md with version history
- [ ] package.json with all required fields
- [ ] .npmignore file

---

## Phase 3: Configuration & Setup

### 3.1 Configuration File Support
**Status**: Pending

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

### 3.2 Environment Variable Precedence
**Status**: Pending

**Priority** (highest to lowest):
1. Command-line arguments
2. Environment variables
3. Config file (~/.filemaker-mcp/config.json)
4. Default values

### 3.3 Setup Command
**Status**: Pending

**Command**: `filemaker-mcp setup`

**Purpose**:
- Interactive configuration wizard
- Create config directory
- Generate config file
- Validate FileMaker connectivity
- Test MCP server startup

---

## Phase 4: Claude Desktop Integration

### 4.1 Installation Guide
**Status**: Pending

**For macOS/Linux/Windows**:
```bash
npm install -g filemaker-data-api-mcp
filemaker-mcp setup
```

### 4.2 Claude Desktop Configuration
**Status**: Pending

**File**: `~/.claude/claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "filemaker": {
      "command": "filemaker-mcp",
      "args": ["--transport", "stdio"],
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

### 4.3 Auto-Configuration Helper
**Status**: Pending

**Command**: `filemaker-mcp configure-claude`

**Purpose**:
- Detect Claude Desktop installation
- Generate configuration
- Update claude_desktop_config.json
- Provide verification steps

---

## Phase 5: Documentation

### 5.1 Installation Guide
**File**: `docs/INSTALLATION.md`

**Content**:
- Global installation via npm
- Local installation for development
- Verification steps
- Troubleshooting

### 5.2 Configuration Guide
**File**: `docs/CONFIGURATION.md`

**Content**:
- Environment variables
- Config file format
- Setup wizard usage
- Advanced options

### 5.3 Publishing Guide
**File**: `docs/PUBLISHING.md`

**Content**:
- npm account setup
- Publishing process
- Version management
- Release checklist

### 5.4 Update README.md
**Status**: Pending

**Add sections**:
- Quick start with npm install
- Global command usage
- Configuration options
- Claude Desktop setup

---

## Phase 6: Testing & Quality Assurance

### 6.1 Unit Tests
**Status**: Pending

**Coverage**:
- Configuration loading
- CLI argument parsing
- Transport initialization
- Error handling

### 6.2 Integration Tests
**Status**: Pending

**Coverage**:
- Full server startup
- Tool execution
- FileMaker API calls
- Error scenarios

### 6.3 Package Testing
**Status**: Pending

**Steps**:
1. Test local installation: `npm install -g .`
2. Test global command: `filemaker-mcp --help`
3. Test setup wizard: `filemaker-mcp setup`
4. Test Claude Desktop integration
5. Test with actual FileMaker server

---

## Phase 7: Publishing & Release

### 7.1 Pre-Release Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] Git tag created
- [ ] Build artifacts generated

### 7.2 npm Publish
**Command**:
```bash
npm publish
```

**First-time**:
```bash
npm login
npm publish
```

### 7.3 Post-Release
- [ ] Verify package on npmjs.com
- [ ] Test installation from npm registry
- [ ] Create GitHub release
- [ ] Announce in documentation

---

## Implementation Timeline

| Phase | Task | Estimated Time | Priority |
|-------|------|-----------------|----------|
| 1 | Update package.json | 30 min | High |
| 1 | Create CLI entry point | 1 hour | High |
| 1 | Create config module | 1.5 hours | High |
| 2 | npm account setup | 15 min | High |
| 2 | GitHub repository | 30 min | High |
| 3 | Config file support | 1 hour | Medium |
| 3 | Setup command | 1.5 hours | Medium |
| 4 | Claude integration helper | 1 hour | Medium |
| 5 | Documentation | 2 hours | Medium |
| 6 | Testing | 2 hours | High |
| 7 | Publishing | 30 min | High |

**Total Estimated Time**: ~12 hours

---

## Success Criteria

- [ ] Package published on npm registry
- [ ] Global installation works: `npm install -g filemaker-data-api-mcp`
- [ ] CLI command available: `filemaker-mcp`
- [ ] Setup wizard works: `filemaker-mcp setup`
- [ ] Claude Desktop integration works
- [ ] Documentation complete and accurate
- [ ] Tests passing (>80% coverage)
- [ ] Package downloads working

---

## Next Steps

1. **Immediate**: Review and approve this plan
2. **Phase 1**: Implement package structure changes
3. **Phase 2**: Set up npm account and GitHub repository
4. **Phase 3-5**: Implement configuration and documentation
5. **Phase 6**: Comprehensive testing
6. **Phase 7**: Publish to npm registry

---

## Notes

- Maintain backward compatibility with existing deployment methods
- Consider semantic versioning (SemVer) for version management
- Plan for future updates and maintenance
- Document known limitations and troubleshooting
- Consider adding GitHub Actions for automated testing/publishing
