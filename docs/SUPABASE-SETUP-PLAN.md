# Tartanism Supabase Setup Plan

> Created: 2026-01-18 | Status: COMPLETED

## Goal
Set up Supabase backend for Tartanism to enable user accounts, pattern saving, sharing, and community features.

## Current State
- ✅ Backend architecture spec complete: `docs/BACKEND-ARCHITECTURE.md`
- ✅ Database schema designed (11 tables)
- ⏳ Need to create Supabase project and integrate with frontend

---

## Step-by-Step Setup Plan

### Step 1: Create Supabase Project
**Status: IN PROGRESS**

1. Go to https://supabase.com/dashboard
2. Sign in with `djm.claude.assistant@gmail.com`
3. Click "New Project"
4. Fill in:
   - **Project name**: `tartanism`
   - **Database password**: `Tartanism2026!SecureDB` (save this!)
   - **Region**: Choose closest (e.g., us-west-1)
5. Click "Create new project" (takes 1-2 minutes)

### Step 2: Run Database Schema
**Status: NOT STARTED**

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the SQL from `docs/BACKEND-ARCHITECTURE.md` Section 2 "Database Schema"
3. Run these in order:
   - Core Tables SQL (profiles, patterns, collections, etc.)
   - Indexes SQL
   - Row-Level Security SQL

**Quick copy command:**
```bash
# The schema is in this file:
cat /Users/djm/claude-projects/github-repos/Tartanism/docs/BACKEND-ARCHITECTURE.md | grep -A 500 "### Core Tables" | head -200
```

### Step 3: Create Storage Bucket
**Status: NOT STARTED**

1. Go to **Storage** in sidebar
2. Click "New bucket"
3. Name: `patterns`
4. Make it **private** (we'll use signed URLs)
5. Click Create

### Step 4: Get API Credentials
**Status: NOT STARTED**

1. Go to **Settings** > **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...` (long JWT string)
3. Save to `/Users/djm/claude-projects/github-repos/Tartanism/.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 5: Configure Authentication
**Status: NOT STARTED**

1. Go to **Authentication** > **Providers**
2. Enable **Google** OAuth:
   - Need Google Cloud Console credentials
   - Create OAuth 2.0 Client ID
   - Add redirect URL: `https://xxxxx.supabase.co/auth/v1/callback`
3. (Optional) Enable **GitHub** OAuth for developer users

### Step 6: Frontend Integration
**Status: COMPLETED**

1. Install Supabase client:
```bash
cd /Users/djm/claude-projects/github-repos/Tartanism
npm install @supabase/supabase-js
```

2. Create Supabase client file:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

3. Create AuthContext (code in BACKEND-ARCHITECTURE.md Section 7)

4. Add login/logout buttons to App.tsx header

5. Implement save/load pattern functions

### Step 7: Test Everything
**Status: NOT STARTED**

1. Run locally: `npm run dev`
2. Test login flow with Google
3. Test saving a pattern
4. Test loading saved patterns
5. Test sharing a pattern

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | CREATE | Supabase credentials |
| `src/lib/supabase.ts` | CREATE | Supabase client |
| `src/contexts/AuthContext.tsx` | CREATE | Auth state management |
| `src/App.tsx` | MODIFY | Add auth UI, save/load buttons |
| `src/types/database.ts` | CREATE | TypeScript types (auto-generated) |

---

## Commands Reference

```bash
# Install Supabase CLI (optional, for local dev)
npm install -g supabase

# Generate TypeScript types from schema
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts

# Start local Supabase (optional)
supabase start
```

---

## Credentials to Save

| Item | Value | Where to Store |
|------|-------|----------------|
| Supabase Project URL | `https://xxxxx.supabase.co` | `.env.local` |
| Supabase Anon Key | `eyJ...` | `.env.local` |
| Database Password | `Tartanism2026!SecureDB` | Password manager |
| Google OAuth Client ID | (from Google Cloud Console) | Supabase dashboard |
| Google OAuth Secret | (from Google Cloud Console) | Supabase dashboard |

---

## Resume Instructions

**To resume this work in a new session, tell Claude:**

> "I'm setting up Supabase for Tartanism. The plan is in `docs/SUPABASE-SETUP-PLAN.md`.
> I'm on Step [X]. Help me complete the setup."

**Or simply:**

> "Continue Tartanism Supabase setup from `docs/SUPABASE-SETUP-PLAN.md`"

---

## Related Files

- `docs/BACKEND-ARCHITECTURE.md` - Full architecture spec with SQL schema
- `.env.local` - Environment variables (don't commit!)
- `src/lib/supabase.ts` - Supabase client (to be created)

---

*Last updated: 2026-01-18*
