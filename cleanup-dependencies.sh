#!/bin/bash

# Dependency Cleanup Script
# This script removes unused dependencies and UI component files
# Review DEPENDENCY_AUDIT.md before running

set -e  # Exit on error

echo "============================================"
echo "Dependency Cleanup Script"
echo "============================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Confirmation prompt
echo -e "${YELLOW}WARNING: This script will:${NC}"
echo "  1. Remove unused Radix UI dependencies"
echo "  2. Delete unused UI component files"
echo "  3. Update package.json and package-lock.json"
echo ""
read -p "Have you reviewed DEPENDENCY_AUDIT.md and want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

echo -e "${GREEN}Starting cleanup...${NC}"
echo ""

# Step 1: Remove unused Radix UI dependencies
echo "Step 1: Removing unused Radix UI dependencies..."
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-slider \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle-group

echo -e "${GREEN}✓ Unused dependencies removed${NC}"
echo ""

# Step 2: Delete unused UI component files
echo "Step 2: Deleting unused UI component files..."

# Create array of files to delete
UNUSED_FILES=(
  "src/components/ui/accordion.tsx"
  "src/components/ui/aspect-ratio.tsx"
  "src/components/ui/avatar.tsx"
  "src/components/ui/breadcrumb.tsx"
  "src/components/ui/carousel.tsx"
  "src/components/ui/chart.tsx"
  "src/components/ui/collapsible.tsx"
  "src/components/ui/command.tsx"
  "src/components/ui/context-menu.tsx"
  "src/components/ui/drawer.tsx"
  "src/components/ui/hover-card.tsx"
  "src/components/ui/input-otp.tsx"
  "src/components/ui/menubar.tsx"
  "src/components/ui/navigation-menu.tsx"
  "src/components/ui/pagination.tsx"
  "src/components/ui/popover.tsx"
  "src/components/ui/progress.tsx"
  "src/components/ui/radio-group.tsx"
  "src/components/ui/resizable.tsx"
  "src/components/ui/scroll-area.tsx"
  "src/components/ui/sidebar.tsx"
  "src/components/ui/slider.tsx"
  "src/components/ui/switch.tsx"
  "src/components/ui/table.tsx"
  "src/components/ui/tabs.tsx"
  "src/components/ui/textarea.tsx"
  "src/components/ui/toggle-group.tsx"
)

# Delete files if they exist
for file in "${UNUSED_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  Deleted: $file"
  else
    echo "  ${YELLOW}Skipped (not found): $file${NC}"
  fi
done

echo -e "${GREEN}✓ Unused UI component files deleted${NC}"
echo ""

# Step 3: Optionally remove low-usage dependencies (commented out by default)
echo "Step 3: Low-usage dependencies (skipped - review manually)"
echo "  The following dependencies have minimal usage:"
echo "    - input-otp (1 use)"
echo "    - embla-carousel-react (1 use)"
echo ""
echo "  To remove them, uncomment the following in this script:"
echo "    # npm uninstall input-otp embla-carousel-react"
echo "    # rm src/components/ui/input-otp.tsx src/components/ui/carousel.tsx"
echo ""

# Uncomment to remove low-usage dependencies:
# npm uninstall input-otp embla-carousel-react
# rm -f src/components/ui/input-otp.tsx src/components/ui/carousel.tsx

# Step 4: Summary
echo "============================================"
echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Run 'npm install' to update lock file"
echo "  2. Run 'npm run dev' to test the application"
echo "  3. Run 'npm run build' to verify production build"
echo "  4. Check bundle size reduction in dist/"
echo "  5. Run your test suite if available"
echo ""
echo "If you encounter issues:"
echo "  - Review DEPENDENCY_AUDIT.md"
echo "  - Use 'git diff' to see changes"
echo "  - Use 'git checkout -- .' to rollback if needed"
echo ""
