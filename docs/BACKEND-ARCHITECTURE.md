# Tartanism Backend Architecture Specification

> Generated: 2026-01-18 | Sources: Claude Research Agent + GPT-5.2-Codex (xhigh reasoning)

## Executive Summary

**Recommended Stack: Supabase + Vercel + Cloudflare R2**

Both research sources independently converged on Supabase as the optimal backend for Tartanism due to:
- All-in-one platform (DB + Auth + Storage + Realtime)
- Generous free tier covering early growth
- PostgreSQL power with JSONB for pattern metadata
- Row-level security for community features
- Open source (can self-host if needed)

---

## 1. Recommended Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Database** | Supabase PostgreSQL | Relational schema fits users/patterns/collections; JSONB for flexible pattern data |
| **Auth** | Supabase Auth | Integrated with DB, OAuth + magic links, 50K MAU free |
| **Storage** | Supabase Storage → Cloudflare R2 | Start simple, migrate to R2 when scaling (zero egress cost) |
| **API** | Supabase auto-REST + Edge Functions | Zero config, serverless, integrates with auth |
| **Frontend Hosting** | Keep GitHub Pages or migrate to Vercel | No change needed for MVP |

### Alternative Stack (Budget-Conscious)
```
Database:  PocketBase (self-hosted, free)
Auth:      PocketBase built-in
Storage:   Cloudflare R2 (10GB free)
Hosting:   Railway ($5/mo)
```

---

## 2. Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patterns
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pattern_type TEXT NOT NULL, -- 'tartan', 'geometric', 'motif', 'image'
  pattern_data JSONB NOT NULL, -- Generator params, palette, seed, config
  image_path TEXT NOT NULL, -- Storage key (NOT base64)
  image_bytes INT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  share_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection Items (junction)
CREATE TABLE collection_items (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, pattern_id)
);

-- Favorites
CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pattern_id)
);

-- Comments (optional)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES patterns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Pattern Stats (denormalized for performance)
CREATE TABLE pattern_stats (
  pattern_id UUID PRIMARY KEY REFERENCES patterns(id) ON DELETE CASCADE,
  favorites_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_patterns_owner ON patterns(owner_id);
CREATE INDEX idx_patterns_visibility ON patterns(visibility) WHERE visibility = 'public';
CREATE INDEX idx_patterns_created ON patterns(created_at DESC);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_comments_pattern ON comments(pattern_id);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Patterns: Owner can do anything, public can read public patterns
CREATE POLICY patterns_owner ON patterns
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY patterns_public_read ON patterns
  FOR SELECT USING (visibility = 'public' OR auth.uid() = owner_id);

-- Favorites: Users can manage their own
CREATE POLICY favorites_owner ON favorites
  FOR ALL USING (auth.uid() = user_id);
```

---

## 3. API Endpoints

### Authentication (Supabase handles these)
```
POST /auth/v1/signup
POST /auth/v1/token?grant_type=password
POST /auth/v1/token?grant_type=refresh_token
POST /auth/v1/logout
GET  /auth/v1/user
POST /auth/v1/magiclink
```

### Patterns
```
GET    /rest/v1/patterns                    # List public patterns (paginated)
GET    /rest/v1/patterns?id=eq.{id}         # Get single pattern
POST   /rest/v1/patterns                    # Create pattern (auth required)
PATCH  /rest/v1/patterns?id=eq.{id}         # Update pattern (owner only)
DELETE /rest/v1/patterns?id=eq.{id}         # Delete pattern (owner only)
GET    /rest/v1/patterns?share_slug=eq.{slug}  # Get by share URL
```

### Collections
```
POST   /rest/v1/collections
GET    /rest/v1/collections?owner_id=eq.{id}
PATCH  /rest/v1/collections?id=eq.{id}
DELETE /rest/v1/collections?id=eq.{id}
POST   /rest/v1/collection_items
DELETE /rest/v1/collection_items?collection_id=eq.{}&pattern_id=eq.{}
```

### Favorites
```
POST   /rest/v1/favorites
DELETE /rest/v1/favorites?user_id=eq.{}&pattern_id=eq.{}
GET    /rest/v1/favorites?user_id=eq.{id}&select=pattern_id,patterns(*)
```

### Community/Discovery
```
GET /rest/v1/patterns?visibility=eq.public&order=created_at.desc&limit=20
GET /rest/v1/patterns?visibility=eq.public&order=pattern_stats(favorites_count).desc
GET /rest/v1/patterns?owner_id=eq.{id}&visibility=eq.public
```

### Custom Edge Functions
```
POST /functions/v1/generate-share-slug  # Create unique share URL
POST /functions/v1/upload-pattern-image # Signed upload to storage
GET  /functions/v1/pattern-stats/{id}   # Increment view count
```

---

## 4. Cost Analysis

### Storage Assumptions
- Average pattern image: 120KB (PNG/WebP, not base64)
- Average patterns per user: 10

### Cost Projections

| Users | Patterns | Storage | Monthly Cost |
|-------|----------|---------|--------------|
| 100 | 1,000 | 120 MB | **$0** (free tier) |
| 1,000 | 10,000 | 1.2 GB | **$25-50** |
| 10,000 | 100,000 | 12 GB | **$200-600** |

### Free Tier Limits (Supabase)
- Database: 500 MB
- Storage: 1 GB
- Auth: 50,000 MAU
- Edge Functions: 500K invocations/month
- Bandwidth: 2 GB

### Cost Optimization Strategies
1. **Convert base64 to PNG/WebP** before storage (50-70% smaller)
2. **CDN caching** for public patterns
3. **Cloudflare R2** for images at scale (zero egress)
4. **Lazy loading** and pagination

---

## 5. Migration Path

### Phase 1: MVP (Week 1-2)
```
1. Create Supabase project
2. Set up tables and RLS policies
3. Add Supabase client to React app
4. Implement: Auth (Google/GitHub OAuth) + Save/Load patterns
5. Keep GitHub Pages deployment
```

### Phase 2: Sharing (Week 3)
```
1. Add share_slug generation
2. Public/private toggle on patterns
3. Shareable URLs: tartanism.app/p/{slug}
```

### Phase 3: Community (Week 4+)
```
1. Public pattern discovery feed
2. Favorites system
3. User profiles
4. Comments (optional)
```

### Frontend Integration
```typescript
// Add to React app
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Save pattern
const savePattern = async (pattern: TartanCardData) => {
  // 1. Upload image to storage
  const { data: imageData } = await supabase.storage
    .from('patterns')
    .upload(`${user.id}/${pattern.id}.png`, pngBlob)

  // 2. Save metadata to database
  const { data } = await supabase
    .from('patterns')
    .insert({
      title: pattern.name,
      pattern_data: pattern.result,
      image_path: imageData.path,
      visibility: 'private'
    })
}
```

---

## 6. Security Considerations

### Rate Limiting
- **Auth endpoints**: 10 req/min per IP
- **Pattern creation**: 20 req/hour per user
- **Image uploads**: 50 MB/hour per user
- **Comments**: 30 req/hour per user

### Image Validation
```typescript
// Server-side validation (Edge Function)
const validateImage = (file: File) => {
  const MAX_SIZE = 2 * 1024 * 1024 // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/jpeg']

  if (file.size > MAX_SIZE) throw new Error('File too large')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid type')

  // Re-encode to strip EXIF/malicious data
  return sharp(file).png().toBuffer()
}
```

### Data Protection
- Row-level security on all tables
- Signed URLs with 1-hour TTL for private images
- HTTPS everywhere
- HttpOnly cookies for auth tokens

### Abuse Prevention
- Content moderation queue for public patterns
- Report button on patterns/comments
- Soft delete with audit trail
- IP-based ban list

---

## 7. Implementation Checklist

### Backend Setup
- [ ] Create Supabase project
- [ ] Create database tables
- [ ] Set up RLS policies
- [ ] Create storage bucket with policies
- [ ] Test auth flow (OAuth + magic link)

### Frontend Integration
- [ ] Install @supabase/supabase-js
- [ ] Add environment variables
- [ ] Create auth context/provider
- [ ] Add login/logout UI
- [ ] Implement save/load patterns
- [ ] Add share functionality

### Community Features
- [ ] Public pattern feed
- [ ] Favorites toggle
- [ ] User profile pages
- [ ] Search/filter patterns
- [ ] Comments (optional)

---

## Quick Start Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push schema
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts
```

---

*This specification was generated from combined research by Claude's research agent and GPT-5.2-Codex with extended reasoning. Both independently recommended Supabase as the optimal solution for Tartanism's backend needs.*
