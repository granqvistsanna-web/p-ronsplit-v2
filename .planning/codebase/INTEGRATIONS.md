# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**Supabase Services:**
- Supabase (https://qswvgfslsginwpqkbbki.supabase.co) - Backend platform providing database, authentication, and real-time capabilities
  - SDK: @supabase/supabase-js 2.90.1
  - Auth: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - Usage: Database queries, user authentication, real-time subscriptions via PostgreSQL

**Edge Functions:**
- Supabase Edge Functions - Used for account deletion operations
  - Function: `delete-user` - Invoked via `supabase.functions.invoke('delete-user')` in `src/hooks/useAuth.tsx`
  - Auth: Bearer token from Supabase session

## Data Storage

**Databases:**
- PostgreSQL 14.1 (via Supabase)
  - Connection: Supabase client initialized with URL and anon key in `src/integrations/supabase/client.ts`
  - Client: @supabase/supabase-js
  - Tables defined in `src/integrations/supabase/types.ts`

**Database Schema:**

Tables include:
- `expenses` - Expense records with splits
- `groups` - Group records with invite codes and member management
- `group_members` - Group membership tracking
- `incomes` - Income records with repeat patterns
- `invitations` - Pending group invitations
- `profiles` - User profile data (private, created via auth trigger)
- `public_profiles` - User profile data visible to group members
- `savings_projects` - Savings goals with target amounts
- `savings_contributions` - User contributions to savings projects
- `settlements` - Monthly settlement records between users
- `playgrounds` - Miscellaneous data (city locations, visited status)

**Database Functions (RLS/Stored Procedures):**
- `is_group_member(text, text)` - Check if user is member of group
- `join_group_by_invite_code(text)` - Join group using invite code

**File Storage:**
- Local filesystem only - No external file storage service integrated
- Excel imports handled in-memory via ExcelJS before database storage

**Caching:**
- TanStack React Query - In-memory caching via @tanstack/react-query
- localStorage persistence - Via @tanstack/react-query-persist-client for offline support
- Data persisted to localStorage with `@tanstack/query-sync-storage-persister`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Custom JWT-based authentication
  - Implementation: OAuth and email/password via Supabase
  - Session management: localStorage storage, auto-token refresh enabled
  - Configuration in `src/integrations/supabase/client.ts`:
    ```typescript
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
    ```

**Auth Hooks & Context:**
- `src/hooks/useAuth.tsx` - Central auth context provider
  - Methods: signUp, signIn, signOut, updatePassword, updateProfile, deleteAccount
  - Profile sync: Automatically fetches user profile from profiles table on auth state change
  - Email verification: Tracks `email_confirmed_at` from Supabase auth

**Protected Profile Data:**
- profiles table - Private user data (name, email, timestamps)
- public_profiles table - Data visible to group members for expense sharing

## Monitoring & Observability

**Error Tracking:**
- Custom error handling via `src/lib/errorHandling.ts`
- Error categories: AUTH, DATABASE, UI, NETWORK
- Severity levels: INFO, WARNING, ERROR, CRITICAL
- Toast notifications via Sonner for user-facing errors

**Logs:**
- Console logging with context (development debug info)
- User-facing error messages in Swedish via Sonner toast notifications
- No external error tracking service integrated (Sentry, Rollbar, etc.)

## CI/CD & Deployment

**Hosting:**
- Static SPA hosting required (Vercel, Netlify, GitHub Pages, etc.)
- No backend infrastructure required beyond Supabase

**CI Pipeline:**
- Not detected - No CI/CD workflow files present
- Development: Vite dev server on localhost:8080
- Build: `npm run build` → `vite build`
- Preview: `npm run preview` → `vite preview`

**Build Outputs:**
- Vite builds to `dist/` directory (standard)
- Development mode uses component tagger for lovable.dev integration

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase publishable API key

**Optional env vars:**
- Development mode detection (Vite automatically)

**Secrets location:**
- Local: `.env` file (not committed, use `.env.example` as template)
- Production: Environment variables set in hosting platform (Vercel, Netlify, etc.)

**Environment file:**
- `.env.example` contains template with Supabase values populated for reference
- Application fails gracefully if env vars missing with helpful error messages

## Webhooks & Callbacks

**Incoming Webhooks:**
- Email confirmation redirects from Supabase
  - Endpoint: `${window.location.origin}/` (dynamic based on app origin)
  - Used in signUp flow for email verification redirect URL
  - Set in `src/hooks/useAuth.tsx` during signup

**Outgoing Webhooks:**
- None detected - Application is read-only from external services perspective

**Supabase Real-time:**
- Configured but usage pattern not visible in basic review
- Client initialized with real-time support via @supabase/supabase-js
- Available for subscription-based updates on database changes

## External Data Sources

**No external data APIs integrated:**
- No REST API calls to third-party services detected
- No payment processing (Stripe, etc.)
- No analytics services (Google Analytics, Mixpanel, etc.)
- No SMS/Email services beyond Supabase auth emails

---

*Integration audit: 2026-01-27*
