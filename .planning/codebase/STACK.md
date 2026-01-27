# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.8.3 - Used throughout the application for type safety in React components, hooks, and configuration
- CSS/Tailwind - Styling with Tailwind CSS 3.4.17 for utility-first styling

## Runtime

**Environment:**
- Node.js (ESM modules via "type": "module" in package.json)

**Package Manager:**
- npm
- Lockfile: package-lock.json present

## Frameworks

**Core:**
- React 18.3.1 - UI framework
- React Router DOM 6.30.1 - Client-side routing
- Vite 7.3.0 - Build tool and dev server

**UI Component Library:**
- Radix UI - Comprehensive headless component library (@radix-ui/react-* packages, v1.1-2.2)
  - Provides: accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip
- shadcn/ui - Component abstractions built on Radix UI (components in `src/components/ui/`)

**State Management & Data:**
- TanStack React Query 5.83.0 - Async data fetching and caching
- TanStack Query Persist Client 5.90.18 - Query persistence
- TanStack Query Sync Storage Persister 5.90.18 - localStorage integration for queries

**Forms:**
- React Hook Form 7.61.1 - Efficient form state management
- @hookform/resolvers 3.10.0 - Validation integration
- Zod 3.25.76 - TypeScript-first schema validation

**UI Utilities:**
- Tailwind Merge 2.6.0 - Merge Tailwind CSS classes intelligently
- Tailwind CSS Animate 1.0.7 - Animation utilities
- Framer Motion 12.23.26 - Animation and interaction library
- Lucide React 0.562.0 - Icon library
- class-variance-authority 0.7.1 - CSS class variants for components

**Data & Export:**
- ExcelJS 4.4.0 - Excel file generation and parsing (used in ImportModal for spreadsheet imports)
- Recharts 2.15.4 - Charting library for data visualization

**Other UI Components:**
- cmdk 1.1.1 - Command/palette component
- date-fns 3.6.0 - Date formatting and manipulation
- embla-carousel-react 8.6.0 - Carousel/slider component
- input-otp 1.4.2 - OTP input component
- next-themes 0.3.0 - Theme management (dark mode support)
- react-day-picker 8.10.1 - Date picker component
- react-resizable-panels 2.1.9 - Resizable panel layout
- sonner 1.7.4 - Toast notification library
- vaul 0.9.9 - Drawer component
- clsx 2.1.1 - Conditional class name utility

**Backend/Database:**
- @supabase/supabase-js 2.90.1 - Supabase client SDK for PostgreSQL database, auth, and real-time features

## Development Tools

**Build & Dev Server:**
- @vitejs/plugin-react-swc 3.11.0 - SWC-based React plugin for Vite (faster build and refresh)
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.21 - Vendor prefix generation

**Linting & Code Quality:**
- ESLint 9.32.0 - JavaScript/TypeScript linting
- @eslint/js 9.32.0 - ESLint base configuration
- typescript-eslint 8.38.0 - TypeScript support for ESLint
- eslint-plugin-react-hooks 5.2.0 - React hooks linting rules
- eslint-plugin-react-refresh 0.4.20 - React refresh plugin

**Type Checking:**
- TypeScript 5.8.3 - Type checking and compilation

**Development Utilities:**
- lovable-tagger 1.1.13 - Component tagging for development (used in componentTagger plugin)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Backend database, authentication, and real-time updates; core to the application
- React 18.3.1 - UI rendering foundation
- React Router DOM 6.30.1 - Application routing
- TanStack React Query 5.83.0 - Data fetching and cache management

**State & Forms:**
- React Hook Form 7.61.1 - Form handling
- Zod 3.25.76 - Schema validation

**UI Components:**
- Radix UI (20+ component packages) - Accessible, unstyled UI primitives
- Framer Motion 12.23.26 - Smooth animations

**Data Export/Import:**
- ExcelJS 4.4.0 - Excel file parsing and generation

## Configuration

**Environment:**
- Supabase credentials via Vite environment variables:
  - `VITE_SUPABASE_URL` - Supabase project URL (https://qswvgfslsginwpqkbbki.supabase.co)
  - `VITE_SUPABASE_ANON_KEY` - Supabase publishable/anon key (for client-side access)
- Variables must be prefixed with `VITE_` to be exposed to client code in Vite
- See `.env.example` in project root for template

**Build:**
- `vite.config.ts` - Vite configuration
  - React SWC plugin for faster builds
  - Path alias: `@/` maps to `src/`
  - Dev server on port 8080
  - Development mode component tagging enabled
- `tailwind.config.ts` - Tailwind CSS configuration
  - Custom spacing based on 8px rhythm
  - Extended fonts: Geist Sans, Geist Mono
  - Dark mode support via class selector
- `tsconfig.json` - TypeScript configuration
  - Base URL: `.`
  - Path alias: `@/*` → `src/*`
  - Less strict checks (skipLibCheck, allowJs, no implicit any)
- `eslint.config.js` - ESLint flat config (ESLint 9+)
  - Extends recommended JS and TypeScript rules
  - React hooks and refresh plugins enabled
  - Ignores dist directory

**PostCSS:**
- `postcss.config.js` - PostCSS configuration with Tailwind CSS and Autoprefixer

## Platform Requirements

**Development:**
- Node.js (ESM modules supported)
- npm package manager
- Modern browser with ES2020+ support

**Production:**
- Static hosting (SPA)
- Supabase backend for database and authentication
- CORS-enabled frontend domain registered in Supabase

---

*Stack analysis: 2026-01-27*
