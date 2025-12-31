# Dependency Audit Report

Generated: 2025-12-31

## Executive Summary

This audit analyzed the project's dependencies for security vulnerabilities, outdated packages, and unnecessary bloat. The analysis found:

- **4 security vulnerabilities** (1 high, 3 moderate)
- **15+ major package updates available**
- **Multiple unused Radix UI components** contributing to bundle bloat
- **Opportunities for dependency cleanup** to reduce bundle size

---

## 1. Security Vulnerabilities 🚨

### Critical Issues

#### 1.1 glob (HIGH - CVE)
- **Severity**: High
- **Current**: 10.2.0-10.4.5
- **Issue**: Command injection via -c/--cmd executes matches with shell:true
- **CVSS Score**: 7.5
- **Fix**: Update to glob >= 10.5.0
- **Priority**: IMMEDIATE

#### 1.2 Vite (MODERATE - Multiple CVEs)
- **Severity**: Moderate
- **Current**: 5.4.19
- **Issues**:
  - Middleware may serve files starting with the same name with the public directory
  - `server.fs` settings were not applied to HTML files
  - Allows `server.fs.deny` bypass via backslash on Windows
- **Fix**: Update to vite >= 6.1.7
- **Priority**: HIGH

#### 1.3 esbuild (MODERATE)
- **Severity**: Moderate
- **Current**: <=0.24.2
- **Issue**: Enables any website to send requests to the development server and read responses
- **CVSS Score**: 5.3
- **Fix**: Update via Vite dependency update
- **Priority**: HIGH

#### 1.4 js-yaml (MODERATE)
- **Severity**: Moderate
- **Current**: 4.0.0-4.1.0
- **Issue**: Prototype pollution in merge (<<)
- **CVSS Score**: 5.3
- **Fix**: Update to js-yaml >= 4.1.1
- **Priority**: MEDIUM

---

## 2. Outdated Packages 📦

### Major Updates Available (Breaking Changes Expected)

| Package | Current | Latest | Type | Priority |
|---------|---------|--------|------|----------|
| `@hookform/resolvers` | 3.10.0 | 5.2.2 | Major | High |
| `react` & `react-dom` | 18.3.1 | 19.2.3 | Major | Medium |
| `react-router-dom` | 6.30.2 | 7.11.0 | Major | Medium |
| `zod` | 3.25.76 | 4.3.2 | Major | Medium |
| `date-fns` | 3.6.0 | 4.1.0 | Major | Medium |
| `react-day-picker` | 8.10.1 | 9.13.0 | Major | Low |
| `recharts` | 2.15.4 | 3.6.0 | Major | Low |
| `tailwind-merge` | 2.6.0 | 3.4.0 | Major | Low |
| `sonner` | 1.7.4 | 2.0.7 | Major | Low |
| `vaul` | 0.9.9 | 1.1.2 | Major | Low |
| `react-resizable-panels` | 2.1.9 | 4.1.0 | Major | Low |

### Minor/Patch Updates

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `lucide-react` | 0.462.0 | 0.562.0 | 100 minor versions behind |
| `next-themes` | 0.3.0 | 0.4.6 | Minor update |
| All Radix UI packages | Various | Latest | Minor patch updates available |

---

## 3. Unused Dependencies & Bloat 🗑️

### Unused Radix UI Components

The following UI component files exist but are **NOT imported anywhere** in the codebase:

**Definitely Unused (No imports found):**
- `@radix-ui/react-accordion` → accordion.tsx
- `@radix-ui/react-aspect-ratio` → aspect-ratio.tsx
- `@radix-ui/react-avatar` → avatar.tsx
- `@radix-ui/react-collapsible` → collapsible.tsx
- `@radix-ui/react-context-menu` → context-menu.tsx
- `@radix-ui/react-hover-card` → hover-card.tsx
- `@radix-ui/react-menubar` → menubar.tsx
- `@radix-ui/react-navigation-menu` → navigation-menu.tsx
- `@radix-ui/react-progress` → progress.tsx
- `@radix-ui/react-radio-group` → radio-group.tsx
- `@radix-ui/react-scroll-area` → scroll-area.tsx
- `@radix-ui/react-slider` → slider.tsx
- `@radix-ui/react-switch` → switch.tsx
- `@radix-ui/react-tabs` → tabs.tsx
- `@radix-ui/react-toggle-group` → toggle-group.tsx

**Potentially Unused (Need verification):**
- `input-otp` (input-otp.tsx) - Only 1 import found
- `embla-carousel-react` (carousel.tsx) - Only 1 import found
- `recharts` (chart.tsx) - Only 2 imports found
- `cmdk` (command.tsx) - 4 imports found
- `vaul` (drawer.tsx) - May not be actively used

### Used Components (Keep)

These are actively used and should be retained:
- button (27 uses)
- label (12 uses)
- input (11 uses)
- card (7 uses)
- select (5 uses)
- checkbox (4 uses)
- tooltip, toast, sonner, dialog, dropdown-menu, alert-dialog, sheet, separator, skeleton, toggle

---

## 4. Recommendations 🎯

### Immediate Actions (Security Fixes)

```bash
# Fix security vulnerabilities
npm audit fix

# If auto-fix doesn't work, update manually:
npm install vite@latest glob@latest
```

### High Priority (Recommended)

1. **Remove Unused Radix UI Dependencies**
   ```bash
   npm uninstall @radix-ui/react-accordion \
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
   ```

2. **Delete Unused UI Component Files**
   ```bash
   rm src/components/ui/accordion.tsx \
      src/components/ui/aspect-ratio.tsx \
      src/components/ui/avatar.tsx \
      src/components/ui/breadcrumb.tsx \
      src/components/ui/carousel.tsx \
      src/components/ui/chart.tsx \
      src/components/ui/collapsible.tsx \
      src/components/ui/command.tsx \
      src/components/ui/context-menu.tsx \
      src/components/ui/drawer.tsx \
      src/components/ui/hover-card.tsx \
      src/components/ui/input-otp.tsx \
      src/components/ui/menubar.tsx \
      src/components/ui/navigation-menu.tsx \
      src/components/ui/pagination.tsx \
      src/components/ui/popover.tsx \
      src/components/ui/progress.tsx \
      src/components/ui/radio-group.tsx \
      src/components/ui/resizable.tsx \
      src/components/ui/scroll-area.tsx \
      src/components/ui/sidebar.tsx \
      src/components/ui/slider.tsx \
      src/components/ui/switch.tsx \
      src/components/ui/table.tsx \
      src/components/ui/tabs.tsx \
      src/components/ui/textarea.tsx \
      src/components/ui/toggle-group.tsx
   ```

3. **Update Critical Packages**
   ```bash
   # Update @hookform/resolvers (breaking change, test forms)
   npm install @hookform/resolvers@latest

   # Update lucide-react (safe minor update)
   npm install lucide-react@latest

   # Update all Radix UI to latest patch versions
   npm update @radix-ui/react-*
   ```

### Medium Priority (Consider Carefully)

1. **React 19 Migration**
   - React 19 introduces breaking changes
   - Review migration guide: https://react.dev/blog/2024/12/05/react-19
   - Test thoroughly before upgrading
   - Update react-dom, react-router-dom, and other React ecosystem packages together

2. **Zod v4 Migration**
   - Zod 4 has breaking changes
   - Review schema definitions before upgrading
   - May affect form validation logic

3. **React Router v7 Migration**
   - Major rewrite with breaking changes
   - Defer until React 19 migration is complete

### Low Priority (Nice to Have)

1. **Update Other Major Versions**
   - `date-fns` 3 → 4
   - `recharts` 2 → 3
   - `tailwind-merge` 2 → 3
   - `sonner` 1 → 2
   - `react-day-picker` 8 → 9

2. **Consider Removing Low-Usage Dependencies**
   - `input-otp` - Only 1 use
   - `embla-carousel-react` - Only 1 use
   - Evaluate if these can be replaced with simpler solutions

---

## 5. Estimated Impact 📊

### Bundle Size Reduction

Removing unused Radix UI components and their dependencies:
- **Estimated savings**: 150-300 KB (minified)
- **Packages to remove**: ~15 Radix UI packages
- **Files to delete**: ~27 unused UI component files

### Security Posture

- **Current vulnerabilities**: 4 (1 high, 3 moderate)
- **After fixes**: 0
- **CVSS scores addressed**: 7.5 (high), 5.3 (moderate)

### Maintenance Burden

- **Outdated packages**: 15+ major versions behind
- **After updates**: Up to date with latest stable versions
- **Future maintenance**: Reduced surface area for security updates

---

## 6. Implementation Plan 🛠️

### Phase 1: Security & Critical (Week 1)
1. Run `npm audit fix`
2. Manually update Vite to latest
3. Update glob dependency
4. Test development and production builds
5. Run full test suite

### Phase 2: Cleanup (Week 2)
1. Remove unused Radix UI dependencies
2. Delete unused UI component files
3. Update lucide-react
4. Update @hookform/resolvers
5. Test all forms and UI components
6. Verify bundle size reduction

### Phase 3: Major Updates (Week 3-4)
1. Plan React 19 migration
2. Review breaking changes in Zod 4
3. Test in isolated branch
4. Update React ecosystem packages together
5. Full regression testing

### Phase 4: Polish (Week 5)
1. Update remaining minor/patch versions
2. Review and remove low-usage dependencies
3. Final bundle size optimization
4. Update documentation

---

## 7. Testing Checklist ✅

After each phase, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts successfully
- [ ] `npm run build` completes without errors
- [ ] All forms submit correctly
- [ ] All UI components render properly
- [ ] Authentication flows work
- [ ] Data persistence works (Supabase integration)
- [ ] Offline functionality intact
- [ ] Mobile responsiveness maintained
- [ ] No console errors in browser
- [ ] Bundle size analyzed (use `npm run build` and check dist/ size)

---

## 8. Rollback Plan 🔄

If issues occur after updates:

```bash
# Revert to previous package.json
git checkout HEAD -- package.json package-lock.json

# Reinstall previous versions
npm install

# If changes were committed
git revert <commit-hash>
```

---

## Notes

- This audit was performed on 2025-12-31
- Based on npm outdated and npm audit reports
- Usage analysis performed via static code analysis
- Verify unused components before deletion (search for dynamic imports)
- Consider keeping some components if planning future features

## Next Steps

1. Review this report with the team
2. Prioritize based on project timeline
3. Create GitHub issues for tracking
4. Schedule maintenance windows for major updates
5. Set up dependency monitoring (Dependabot/Renovate)
