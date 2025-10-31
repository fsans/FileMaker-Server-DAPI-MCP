# Testing Guide

## Quick Start

### Install Dependencies
```bash
npm install --save-dev jest ts-jest @types/jest @jest/globals
```

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## Test Structure

- **Unit Tests** (`tests/unit/`) - Test individual components
- **Integration Tests** (`tests/integration/`) - Test component interactions
- **E2E Tests** (`tests/e2e/`) - Test complete workflows

---

## Test Suites

### Unit Tests: ConnectionManager (25+ tests)
- Initialization
- Adding connections
- Removing connections
- Switching connections
- Default connection management
- Listing connections
- Validation
- File permissions

### Integration Tests: CLI Commands (15+ tests)
- add-connection command
- remove-connection command
- list-connections command
- set-default command
- config show command
- Connection persistence
- Error handling

### E2E Tests: Workflows (15+ test scenarios)
- Setup predefined connections
- Switch between databases
- Inline connection setup
- Multi-database queries
- Connection management lifecycle
- Error recovery
- Persistence and recovery
- Security validation

---

## Running Specific Tests

```bash
# Unit tests only
npm test -- tests/unit/

# Integration tests only
npm test -- tests/integration/

# E2E tests only
npm test -- tests/e2e/

# Specific test file
npm test -- connection-manager.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

---

## Coverage Goals

| Metric | Target |
|--------|--------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

---

## Test Execution

Total test cases: **55+**
Estimated execution time: **5-10 seconds**

---

## Troubleshooting

### Jest not finding tests
- Ensure files are in `tests/` directory
- Check `jest.config.js` testMatch pattern
- Verify file extensions are `.test.ts`

### TypeScript errors
- Run `npm run build` to check compilation
- Verify `tsconfig.json` settings
- Check import paths use `.js` extension for ESM

### Module not found
- Run `npm install` to install dependencies
- Check import statements in test files
- Verify relative paths are correct

---

## Next Steps

1. Install Jest dependencies
2. Run `npm test` to execute all tests
3. Review coverage report: `npm test -- --coverage`
4. Fix any failing tests
5. Commit test suite to repository

---

For detailed information, see `PHASE_2G_TESTING.md`
