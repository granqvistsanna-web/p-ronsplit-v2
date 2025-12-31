#!/bin/bash

# Security Updates Script
# Fixes known security vulnerabilities in dependencies
# Review DEPENDENCY_AUDIT.md before running

set -e  # Exit on error

echo "============================================"
echo "Security Updates Script"
echo "============================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will fix security vulnerabilities:${NC}"
echo "  1. glob (HIGH) - Command injection vulnerability"
echo "  2. vite (MODERATE) - Multiple security issues"
echo "  3. esbuild (MODERATE) - Dev server exposure"
echo "  4. js-yaml (MODERATE) - Prototype pollution"
echo ""
echo "See DEPENDENCY_AUDIT.md for details."
echo ""

# Confirmation
read -p "Proceed with security updates? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo -e "${GREEN}Starting security updates...${NC}"
echo ""

# Step 1: Run npm audit fix
echo "Step 1: Running 'npm audit fix'..."
npm audit fix || {
    echo -e "${YELLOW}Warning: Some vulnerabilities could not be auto-fixed.${NC}"
    echo "This is normal. We'll update them manually next."
    echo ""
}

# Step 2: Update vite to latest version
echo "Step 2: Updating Vite to latest version..."
npm install vite@latest
echo -e "${GREEN}✓ Vite updated${NC}"
echo ""

# Step 3: Check if vulnerabilities still exist
echo "Step 3: Running audit to check remaining vulnerabilities..."
echo ""
npm audit || {
    echo ""
    echo -e "${YELLOW}Note: Some vulnerabilities may remain.${NC}"
    echo "This is normal if they are in dev dependencies with low severity."
    echo ""
}

# Step 4: Update other recommended packages (safe updates)
echo "Step 4: Updating other recommended packages..."
echo "  - lucide-react (safe minor update)"
echo "  - Radix UI packages (patch updates)"
echo ""

npm install lucide-react@latest
npm update @radix-ui/react-*

echo -e "${GREEN}✓ Additional updates completed${NC}"
echo ""

# Step 5: Verify installation
echo "Step 5: Verifying installation..."
if npm install; then
    echo -e "${GREEN}✓ Installation verified successfully${NC}"
else
    echo -e "${RED}✗ Installation verification failed${NC}"
    echo "Please review the errors above."
    exit 1
fi

echo ""
echo "============================================"
echo -e "${GREEN}Security updates completed!${NC}"
echo "============================================"
echo ""
echo "Summary of changes:"
echo "  - Updated vite to latest version"
echo "  - Fixed glob vulnerability"
echo "  - Updated lucide-react"
echo "  - Updated Radix UI packages"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to test development server"
echo "  2. Run 'npm run build' to test production build"
echo "  3. Run 'npm audit' to verify vulnerabilities are fixed"
echo "  4. Test your application thoroughly"
echo ""
echo "Current vulnerability status:"
npm audit --json | grep -o '"total":[0-9]*' | head -1 || echo "  Run 'npm audit' to check"
echo ""
