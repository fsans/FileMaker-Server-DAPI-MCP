# Dynamic Connection Management - Implementation Plan

## Overview

Extend the existing FileMaker MCP Server to support dynamic database connections, allowing users to switch between multiple FileMaker databases at runtime without restarting the server.

## Architecture: Option 3 (Single MCP with Logical Separation)

**Single server** with three tool categories:
1. **Configuration Tools** - Manage saved connections
2. **Connection Tools** - Switch/establish connections at runtime
3. **Data Access Tools** - Query FileMaker (existing, enhanced)

---

## Phase 2A: Connection Management Module

### New File: `src/connection.ts`

**Responsibilities**:
- Manage current active connection
- Store connection state
- Handle connection switching
- Validate connection parameters
- Support both predefined and inline connections

**Exports**:
```typescript
interface Connection {
  name?: string;
  server: string;
  version: string;
  database: string;
  user: string;
  password: string;
}

class ConnectionManager {
  getCurrentConnection(): Connection
  setConnection(connection: Connection): void
  switchToConnection(name: string): void
  validateConnection(connection: Connection): ValidationResult
}
```

---

## Phase 2B: Configuration Tools

### New File: `src/tools/configuration.ts`

**Tools to implement**:

#### 1. `fm_config_add_connection`
```typescript
{
  name: "fm_config_add_connection",
  description: "Add a new predefined FileMaker database connection",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Connection name (e.g., 'production', 'staging')" },
      server: { type: "string", description: "FileMaker Server IP/hostname" },
      database: { type: "string", description: "Database name" },
      user: { type: "string", description: "Username" },
      password: { type: "string", description: "Password" },
      version: { type: "string", description: "API version (default: vLatest)" }
    },
    required: ["name", "server", "database", "user", "password"]
  }
}
```

#### 2. `fm_config_remove_connection`
```typescript
{
  name: "fm_config_remove_connection",
  description: "Remove a predefined database connection",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Connection name to remove" }
    },
    required: ["name"]
  }
}
```

#### 3. `fm_config_list_connections`
```typescript
{
  name: "fm_config_list_connections",
  description: "List all available predefined database connections",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

#### 4. `fm_config_get_connection`
```typescript
{
  name: "fm_config_get_connection",
  description: "Get details of a specific connection (password masked)",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Connection name" }
    },
    required: ["name"]
  }
}
```

#### 5. `fm_config_set_default_connection`
```typescript
{
  name: "fm_config_set_default_connection",
  description: "Set the default connection to use at startup",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Connection name to set as default" }
    },
    required: ["name"]
  }
}
```

---

## Phase 2C: Connection Tools

### New File: `src/tools/connection.ts`

**Tools to implement**:

#### 1. `fm_set_connection`
```typescript
{
  name: "fm_set_connection",
  description: "Switch to a predefined FileMaker database connection",
  inputSchema: {
    type: "object",
    properties: {
      connectionName: { type: "string", description: "Name of predefined connection" }
    },
    required: ["connectionName"]
  }
}
```

#### 2. `fm_connect`
```typescript
{
  name: "fm_connect",
  description: "Connect to a FileMaker database with inline credentials",
  inputSchema: {
    type: "object",
    properties: {
      server: { type: "string", description: "FileMaker Server IP/hostname" },
      database: { type: "string", description: "Database name" },
      user: { type: "string", description: "Username" },
      password: { type: "string", description: "Password" },
      version: { type: "string", description: "API version (default: vLatest)" }
    },
    required: ["server", "database", "user", "password"]
  }
}
```

#### 3. `fm_list_connections`
```typescript
{
  name: "fm_list_connections",
  description: "List all available predefined connections",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

#### 4. `fm_get_current_connection`
```typescript
{
  name: "fm_get_current_connection",
  description: "Get the currently active connection details (password masked)",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

---

## Phase 2D: Update Existing Data Access Tools

### Modify: `src/index.ts`

**Changes**:
1. Update `FileMakerAPIClient` to use `ConnectionManager`
2. Modify all data access tools to use current connection
3. Update `fm_login` to use current connection parameters
4. Ensure connection validation before operations

**Example**:
```typescript
// Before
async fm_login(database?: string, username?: string, password?: string)

// After
async fm_login(database?: string, username?: string, password?: string) {
  // Use provided params OR current connection
  const conn = connectionManager.getCurrentConnection();
  const db = database || conn.database;
  const user = username || conn.user;
  const pass = password || conn.password;
  // ... rest of login logic
}
```

---

## Phase 2E: Update Configuration Module

### Modify: `src/config.ts`

**Add**:
- `connections` object to store predefined connections
- `defaultConnection` string to track default
- Functions to manage connections:
  - `addConnection(name, connection)`
  - `removeConnection(name)`
  - `getConnection(name)`
  - `listConnections()`
  - `setDefaultConnection(name)`

**Config file structure**:
```json
{
  "server": { /* existing */ },
  "filemaker": { /* existing */ },
  "connections": {
    "production": {
      "server": "192.168.0.24",
      "version": "vLatest",
      "database": "Sales",
      "user": "admin",
      "password": "xxx"
    },
    "staging": {
      "server": "192.168.0.25",
      "version": "vLatest",
      "database": "SalesTest",
      "user": "admin",
      "password": "yyy"
    }
  },
  "defaultConnection": "production"
}
```

---

## Phase 2F: Update CLI

### Modify: `src/bin/cli.ts`

**Add commands**:
```bash
filemaker-mcp config add-connection <name> \
  --server <ip> \
  --database <name> \
  --user <username> \
  --password <password> \
  [--version <version>]

filemaker-mcp config remove-connection <name>

filemaker-mcp config list-connections

filemaker-mcp config get-connection <name>

filemaker-mcp config set-default-connection <name>

filemaker-mcp start [--connection <name>]
```

---

## File Structure After Implementation

```
src/
├── index.ts                          (main server, updated)
├── config.ts                         (updated with connections)
├── connection.ts                     (NEW)
├── bin/
│   └── cli.ts                        (updated with new commands)
├── tools/
│   ├── configuration.ts              (NEW: fm_config_* tools)
│   ├── connection.ts                 (NEW: fm_set_connection, fm_connect, etc.)
│   ├── data-access.ts                (NEW: refactored existing tools)
│   └── index.ts                      (NEW: export all tools)
└── transport.ts                      (existing)
```

---

## Implementation Steps

### Step 1: Create Connection Manager
- [ ] Create `src/connection.ts`
- [ ] Implement `ConnectionManager` class
- [ ] Add connection state management
- [ ] Add connection validation

### Step 2: Create Configuration Tools
- [ ] Create `src/tools/configuration.ts`
- [ ] Implement all 5 configuration tools
- [ ] Add handlers in `src/index.ts`

### Step 3: Create Connection Tools
- [ ] Create `src/tools/connection.ts`
- [ ] Implement all 4 connection tools
- [ ] Add handlers in `src/index.ts`

### Step 4: Refactor Data Access Tools
- [ ] Create `src/tools/data-access.ts`
- [ ] Move existing tools to new file
- [ ] Update to use `ConnectionManager`
- [ ] Update `src/index.ts` to import from tools

### Step 5: Update Configuration Module
- [ ] Extend `src/config.ts` with connection management
- [ ] Add connection persistence
- [ ] Add default connection support

### Step 6: Update CLI
- [ ] Add connection management commands to `src/bin/cli.ts`
- [ ] Add `--connection` flag to `start` command
- [ ] Test all new commands

### Step 7: Testing
- [ ] Unit tests for `ConnectionManager`
- [ ] Integration tests for tools
- [ ] End-to-end tests with Claude Desktop
- [ ] Test connection switching

### Step 8: Documentation
- [ ] Update README.md with new features
- [ ] Create CONNECTIONS.md guide
- [ ] Update QUICK_START_NPM.md
- [ ] Add examples to documentation

---

## User Workflows After Implementation

### Workflow 1: Setup Predefined Connections
```bash
filemaker-mcp config add-connection production \
  --server 192.168.0.24 \
  --database Sales \
  --user admin \
  --password xxx

filemaker-mcp config add-connection staging \
  --server 192.168.0.25 \
  --database SalesTest \
  --user admin \
  --password yyy

filemaker-mcp config set-default-connection production
```

### Workflow 2: Start Server with Connection
```bash
filemaker-mcp start                    # Uses default (production)
filemaker-mcp start --connection staging  # Uses staging
```

### Workflow 3: Claude Instructions
```
User: "Show me production contacts"
Claude: 
  → fm_set_connection(connectionName: "production")
  → fm_login()
  → fm_get_records(layout: "Contacts")
  → Returns contacts from production

User: "Now show me staging contacts"
Claude:
  → fm_set_connection(connectionName: "staging")
  → fm_login()
  → fm_get_records(layout: "Contacts")
  → Returns contacts from staging
```

### Workflow 4: Inline Connection
```
User: "Connect to 192.168.0.26, database TestDB, user admin, password test123. Show records."
Claude:
  → fm_connect(server: "192.168.0.26", database: "TestDB", user: "admin", password: "test123")
  → fm_login()
  → fm_get_records(layout: "Contacts")
  → Returns contacts from TestDB
```

---

## Tool Count Summary

**Before**: ~20 tools (data access only)

**After**: ~29 tools
- 5 configuration tools (fm_config_*)
- 4 connection tools (fm_set_connection, fm_connect, fm_list_connections, fm_get_current_connection)
- ~20 data access tools (existing, unchanged)

**Impact**: Manageable increase, all tools clearly categorized

---

## Backward Compatibility

✅ **Fully backward compatible**:
- Existing tools work unchanged
- Default behavior uses default connection
- No breaking changes to existing workflows
- Old single-connection setup still works

---

## Security Considerations

✅ **Password Security**:
- Stored in `~/.filemaker-mcp/config.json` with 0o600 permissions
- Never logged or exposed in responses
- Masked in `fm_config_get_connection` output

✅ **Connection Validation**:
- Validate all connection parameters
- Test connectivity before switching
- Clear error messages for failures

---

## Testing Strategy

### Unit Tests
- `ConnectionManager` class
- Configuration persistence
- Connection validation

### Integration Tests
- Tool handlers
- Connection switching
- Data access with different connections

### End-to-End Tests
- CLI commands
- Claude Desktop integration
- Multi-connection workflows

---

## Estimated Implementation Time

| Phase | Task | Time |
|-------|------|------|
| 2A | Connection Manager | 1 hour |
| 2B | Configuration Tools | 1.5 hours |
| 2C | Connection Tools | 1 hour |
| 2D | Update Data Access | 1.5 hours |
| 2E | Update Config Module | 1 hour |
| 2F | Update CLI | 1 hour |
| 2G | Testing | 2 hours |
| 2H | Documentation | 1 hour |
| **Total** | | **~10 hours** |

---

## Next Steps

1. Review and approve this plan
2. Start Phase 2A: Create `src/connection.ts`
3. Proceed through phases sequentially
4. Test after each phase
5. Document as we go

---

**Status**: Plan Ready for Implementation
**Approach**: Option 3 (Single MCP with Logical Separation)
**Next**: Begin Phase 2A when ready
