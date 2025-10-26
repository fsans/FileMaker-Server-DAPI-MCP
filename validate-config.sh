#!/bin/bash

# FileMaker Data API MCP Configuration Validator
# This script validates your setup and configuration before deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for checks
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_check() {
    echo -n "  ✓ $1"
}

print_pass() {
    echo -e " ${GREEN}[PASS]${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e " ${RED}[FAIL]${NC}"
    echo -e "    ${RED}Error: $2${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e " ${YELLOW}[WARN]${NC}"
    echo -e "    ${YELLOW}Warning: $2${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "    ${BLUE}ℹ $1${NC}"
}

# === MAIN CHECKS ===

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FileMaker Data API MCP - Configuration Validator          ║"
echo "║  Version 1.0                                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Node.js Version Check
print_header "Node.js & Dependencies"

print_check "Node.js installed"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)

    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_pass
        print_info "Version: $NODE_VERSION"
    else
        print_fail "Node.js version too old (found $NODE_VERSION, require v18+)"
    fi
else
    print_fail "Node.js not found - install from https://nodejs.org/"
fi

print_check "npm installed"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_pass
    print_info "Version: $NPM_VERSION"
else
    print_fail "npm not found"
fi

# 2. Project Structure Check
print_header "Project Structure"

print_check "package.json exists"
if [ -f "package.json" ]; then
    print_pass
else
    print_fail "package.json not found - ensure you're in the project root directory"
fi

print_check "src/index.ts exists"
if [ -f "src/index.ts" ]; then
    print_pass
else
    print_fail "src/index.ts not found"
fi

print_check "node_modules directory"
if [ -d "node_modules" ]; then
    print_pass
    print_info "Size: $(du -sh node_modules 2>/dev/null | cut -f1)"
else
    print_warning "node_modules not found" "Run 'npm install' to download dependencies"
fi

print_check "dist directory (build output)"
if [ -d "dist" ]; then
    print_pass
else
    print_warning "dist directory not found" "Run 'npm run build' to compile TypeScript"
fi

# 3. Build Status Check
print_header "Build Status"

if [ -f "dist/index.js" ]; then
    print_check "dist/index.js compiled"
    print_pass
    FILE_SIZE=$(stat -f%z "dist/index.js" 2>/dev/null || stat -c%s "dist/index.js" 2>/dev/null)
    print_info "Size: $(numfmt --to=iec $FILE_SIZE 2>/dev/null || echo "$FILE_SIZE bytes")"

    # Check if it's recent
    FILE_AGE=$(($(date +%s) - $(stat -f%m "dist/index.js" 2>/dev/null || stat -c%Y "dist/index.js" 2>/dev/null)))
    if [ $FILE_AGE -gt 3600 ]; then
        print_warning "Build is older than 1 hour" "Run 'npm run build' to ensure latest version"
    fi
else
    print_fail "dist/index.js not found" "Run 'npm run build' to compile"
fi

if [ -f "dist/index.d.ts" ]; then
    print_check "TypeScript declarations generated"
    print_pass
else
    print_warning "dist/index.d.ts not found" "Run 'npm run build'"
fi

# 4. Configuration Check
print_header "Environment Configuration"

if [ -f ".env" ]; then
    print_check ".env file exists"
    print_pass

    # Check for required variables
    source .env 2>/dev/null || true

    print_check "FM_SERVER configured"
    if [ -n "$FM_SERVER" ]; then
        print_pass
        print_info "Value: $FM_SERVER"
    else
        print_fail "FM_SERVER not set"
    fi

    print_check "FM_DATABASE configured"
    if [ -n "$FM_DATABASE" ]; then
        print_pass
        print_info "Value: $FM_DATABASE"
    else
        print_fail "FM_DATABASE not set"
    fi

    print_check "FM_USER configured"
    if [ -n "$FM_USER" ]; then
        print_pass
        print_info "Value: $FM_USER (password masked)"
    else
        print_fail "FM_USER not set"
    fi

    print_check "FM_PASSWORD configured"
    if [ -n "$FM_PASSWORD" ]; then
        print_pass
    else
        print_fail "FM_PASSWORD not set"
    fi

    print_check "FM_VERSION configured"
    if [ -n "$FM_VERSION" ]; then
        print_pass
        print_info "Value: $FM_VERSION"
    else
        print_fail "FM_VERSION not set"
    fi
else
    print_fail ".env file not found" "Run: cp .env.example .env"
fi

print_check ".env.example exists (template)"
if [ -f ".env.example" ]; then
    print_pass
else
    print_warning ".env.example not found" "Should exist for reference"
fi

# 5. Git Check
print_header "Version Control"

if [ -d ".git" ]; then
    print_check "Git repository"
    print_pass

    if git rev-parse --git-dir > /dev/null 2>&1; then
        BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        print_info "Current branch: $BRANCH"

        # Check if .env is in .gitignore
        if [ -f ".gitignore" ] && grep -q "\.env" .gitignore; then
            print_info ".env is in .gitignore (good for security)"
        else
            print_warning ".env not in .gitignore" "Add '*.env' to .gitignore to prevent credentials from being committed"
        fi
    fi
else
    print_warning "Not a git repository" "Optional, but recommended for version control"
fi

# 6. Tool Verification
print_header "Tool Definitions"

if [ -f "dist/index.js" ]; then
    # Try to count fm_ tools (they should be in the compiled output)
    TOOL_COUNT=$(grep -o '"name": "fm_[^"]*"' dist/index.js 2>/dev/null | wc -l || echo "0")

    print_check "Tool definitions compiled"
    if [ "$TOOL_COUNT" -ge 20 ]; then
        print_pass
        print_info "Found $TOOL_COUNT tools"
    else
        print_warning "Expected ~20 tools, found $TOOL_COUNT" "Run 'npm run build' if tools are missing"
    fi
fi

# 7. Documentation Check
print_header "Documentation"

docs_found=0

[ -f "README.md" ] && { print_check "README.md exists"; print_pass; ((docs_found++)); }
[ -f "QUICKSTART.md" ] && { print_check "QUICKSTART.md exists"; print_pass; ((docs_found++)); }
[ -f "DEPLOYMENT_AND_TESTING.md" ] && { print_check "DEPLOYMENT_AND_TESTING.md exists"; print_pass; ((docs_found++)); }
[ -f "QUICK_REFERENCE.md" ] && { print_check "QUICK_REFERENCE.md exists"; print_pass; ((docs_found++)); }
[ -f "CHANGELOG.md" ] && { print_check "CHANGELOG.md exists"; print_pass; ((docs_found++)); }

if [ "$docs_found" -lt 3 ]; then
    print_warning "Some documentation files missing" "Expected README, QUICKSTART, and deployment guides"
fi

# 8. Network/Connectivity Check
print_header "Network Configuration"

if [ -n "$FM_SERVER" ]; then
    print_check "Connectivity to FM_SERVER: $FM_SERVER"

    # Try DNS resolution first
    if ping -c 1 -t 1 "$FM_SERVER" &> /dev/null 2>&1 || ping -c 1 -W 1000 "$FM_SERVER" &> /dev/null 2>&1; then
        print_pass
    else
        print_warning "Cannot reach $FM_SERVER" "Ensure FileMaker Server is running and network is accessible"
    fi
else
    print_warning "FM_SERVER not configured" "Cannot test connectivity"
fi

# === SUMMARY ===

print_header "Validation Summary"

TOTAL=$((PASSED + FAILED + WARNINGS))

echo -e "  ${GREEN}✓ Passed:${NC} $PASSED/$TOTAL"
if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}✗ Failed:${NC} $FAILED/$TOTAL"
fi
if [ $WARNINGS -gt 0 ]; then
    echo -e "  ${YELLOW}⚠ Warnings:${NC} $WARNINGS/$TOTAL"
fi

echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Your setup is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start the server: npm start"
    echo "  2. Test with Claude Desktop (configure in claude_desktop_config.json)"
    echo "  3. Or use with Postman: DataAPI.postman_collection.json"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}✓ Checks mostly passed, but address warnings above.${NC}"
    echo ""
    echo "You can start the server with: npm start"
    echo "But address the warnings for best results."
    exit 0
else
    echo -e "${RED}✗ Setup has issues. Fix the failures above before proceeding.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Install Node.js: https://nodejs.org/ (v18+)"
    echo "  - Install dependencies: npm install"
    echo "  - Build project: npm run build"
    echo "  - Create .env file: cp .env.example .env"
    exit 1
fi
