-- ============================================================
-- CreatorMatch Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
-- One profile per auth user (creator or client)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client', -- 'creator' | 'client'
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'role', 'client'), new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── CREATOR LISTINGS ─────────────────────────────────────────
create table if not exists creator_listings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  business_name text,
  avatar text default '🎬',
  bio text,
  experience text default 'mid', -- 'entry' | 'mid' | 'senior'
  years_experience int,
  tags text[] default '{}',
  availability text default 'available', -- 'available' | 'busy' | 'unavailable'
  verified boolean default false,
  plan text default 'free', -- 'free' | 'pro' | 'studio'
  -- Location
  city text,
  state text,
  country text default 'US',
  zip text,
  region_key text default 'us-tier2',
  -- Contact
  email text,
  phone text,
  website text,
  instagram text,
  -- Stats
  rating numeric(3,1),
  review_count int default 0,
  view_count int default 0,
  -- Stripe
  stripe_account_id text,
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── CREATOR SERVICES ─────────────────────────────────────────
create table if not exists creator_services (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  service_id text not null, -- 'video' | 'photography' | etc.
  subtypes text[] default '{}',
  description text,
  rates jsonb default '{}',
  created_at timestamptz default now()
);

-- ── PORTFOLIO ITEMS ──────────────────────────────────────────
create table if not exists portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  service_id text,
  title text not null,
  description text,
  image_url text,
  link text,
  display_order int default 0,
  created_at timestamptz default now()
);

-- ── PACKAGES ─────────────────────────────────────────────────
create table if not exists packages (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  service_id text not null,
  name text not null, -- 'Basic' | 'Standard' | 'Premium'
  description text,
  price numeric(10,2) not null,
  deliverables text[] default '{}',
  turnaround_days int,
  revisions int default 1,
  display_order int default 0,
  created_at timestamptz default now()
);

-- ── AVAILABILITY ─────────────────────────────────────────────
create table if not exists availability (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  date date not null,
  status text default 'booked', -- 'booked' | 'available' | 'tentative'
  note text,
  unique(listing_id, date)
);

-- ── REVIEWS ──────────────────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null,
  reviewer_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  service_id text,
  verified_purchase boolean default false,
  created_at timestamptz default now()
);

-- ── FAVORITES ────────────────────────────────────────────────
create table if not exists favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  listing_id uuid references creator_listings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

-- ── QUOTE REQUESTS ───────────────────────────────────────────
create table if not exists quote_requests (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  client_id uuid references profiles(id) on delete set null,
  client_name text not null,
  client_email text not null,
  service_id text,
  budget numeric(10,2),
  description text not null,
  timeline text,
  status text default 'pending', -- 'pending' | 'viewed' | 'responded' | 'declined'
  created_at timestamptz default now()
);

-- ── MESSAGES ─────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null,
  sender_id uuid references profiles(id) on delete cascade,
  recipient_id uuid references profiles(id) on delete cascade,
  listing_id uuid references creator_listings(id) on delete set null,
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- ── PROJECTS ─────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references profiles(id) on delete cascade,
  title text not null,
  service_id text,
  description text not null,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  location text,
  timeline text,
  status text default 'open', -- 'open' | 'in_progress' | 'completed' | 'cancelled'
  created_at timestamptz default now()
);

-- Project applications (creators apply to projects)
create table if not exists project_applications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  listing_id uuid references creator_listings(id) on delete cascade,
  message text,
  proposed_rate numeric(10,2),
  status text default 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at timestamptz default now(),
  unique(project_id, listing_id)
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references creator_listings(id) on delete cascade,
  plan text not null, -- 'free' | 'pro' | 'studio'
  stripe_subscription_id text,
  stripe_customer_id text,
  status text default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table profiles enable row level security;
alter table creator_listings enable row level security;
alter table creator_services enable row level security;
alter table portfolio_items enable row level security;
alter table packages enable row level security;
alter table availability enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;
alter table quote_requests enable row level security;
alter table messages enable row level security;
alter table projects enable row level security;
alter table project_applications enable row level security;
alter table subscriptions enable row level security;

-- Profiles: users can read all, update only their own
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Listings: public read, creators manage their own
create policy "Listings are viewable by everyone" on creator_listings for select using (true);
create policy "Creators can insert own listings" on creator_listings for insert with check (auth.uid() = user_id);
create policy "Creators can update own listings" on creator_listings for update using (auth.uid() = user_id);
create policy "Creators can delete own listings" on creator_listings for delete using (auth.uid() = user_id);

-- Services, portfolio, packages, availability: follow listing ownership
create policy "Services viewable by everyone" on creator_services for select using (true);
create policy "Creators manage own services" on creator_services for all using (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);

create policy "Portfolio viewable by everyone" on portfolio_items for select using (true);
create policy "Creators manage own portfolio" on portfolio_items for all using (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);

create policy "Packages viewable by everyone" on packages for select using (true);
create policy "Creators manage own packages" on packages for all using (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);

create policy "Availability viewable by everyone" on availability for select using (true);
create policy "Creators manage own availability" on availability for all using (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);

-- Reviews: public read, authenticated users can write
create policy "Reviews viewable by everyone" on reviews for select using (true);
create policy "Authenticated users can write reviews" on reviews for insert with check (auth.uid() is not null);

-- Favorites: users manage their own
create policy "Users can view own favorites" on favorites for select using (auth.uid() = user_id);
create policy "Users can manage own favorites" on favorites for all using (auth.uid() = user_id);

-- Quote requests: clients create, creators view their own
create policy "Creators can view their quote requests" on quote_requests for select using (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
  or auth.uid() = client_id
);
create policy "Anyone can send quote requests" on quote_requests for insert with check (true);
create policy "Creators can update quote status" on quote_requests for update using (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);

-- Messages: participants can read/write their own
create policy "Users can view their messages" on messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy "Authenticated users can send messages" on messages for insert with check (auth.uid() = sender_id);

-- Projects: public read, clients manage their own
create policy "Projects viewable by everyone" on projects for select using (true);
create policy "Clients can manage own projects" on projects for all using (auth.uid() = client_id);

-- Project applications: creators apply, clients see theirs
create policy "Applications viewable by project owner and applicant" on project_applications for select using (
  exists (select 1 from projects where id = project_id and client_id = auth.uid())
  or exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);
create policy "Creators can apply to projects" on project_applications for insert with check (
  exists (select 1 from creator_listings where id = listing_id and user_id = auth.uid())
);

-- ── STORAGE BUCKETS ──────────────────────────────────────────
-- Run these separately in Supabase Storage settings:
-- Create bucket: "portfolio-images" (public)
-- Create bucket: "avatars" (public)

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_listings_region on creator_listings(region_key);
create index if not exists idx_listings_country on creator_listings(country);
create index if not exists idx_services_listing on creator_services(listing_id);
create index if not exists idx_services_type on creator_services(service_id);
create index if not exists idx_portfolio_listing on portfolio_items(listing_id);
create index if not exists idx_reviews_listing on reviews(listing_id);
create index if not exists idx_favorites_user on favorites(user_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_projects_status on projects(status);

-- ============================================================
-- STRIPE CONNECT + PAYMENTS (appended)
-- ============================================================

-- Add Stripe fields to creator_listings (idempotent)
ALTER TABLE creator_listings
  ADD COLUMN IF NOT EXISTS stripe_onboarded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payouts_enabled  boolean DEFAULT false;
-- Note: stripe_account_id already exists in the original schema

-- ── TRANSACTIONS ─────────────────────────────────────────────
-- All monetary amounts stored in CENTS (integers)
CREATE TABLE IF NOT EXISTS transactions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             text NOT NULL,
  creator_id             text NOT NULL,
  client_id              uuid REFERENCES auth.users(id) NOT NULL,

  project_amount         integer NOT NULL,  -- total project value in cents
  retainer_amount        integer NOT NULL,  -- 50% in cents
  final_amount           integer NOT NULL,  -- 50% in cents
  creator_fee_pct        numeric(4,2) DEFAULT 10.00,
  client_fee_pct         numeric(4,2) DEFAULT 5.00,
  creator_fee_amount     integer NOT NULL,  -- platform take from creator in cents
  client_fee_amount      integer NOT NULL,  -- platform take from client in cents
  platform_revenue       integer NOT NULL,  -- total platform revenue in cents

  retainer_status        text DEFAULT 'pending',   -- pending | paid | released | refunded
  final_status           text DEFAULT 'pending',   -- pending | paid | released | refunded

  retainer_payment_intent text,
  final_payment_intent    text,
  retainer_transfer_id    text,
  final_transfer_id       text,

  retainer_paid_at       timestamptz,
  final_paid_at          timestamptz,
  retainer_released_at   timestamptz,
  final_released_at      timestamptz,

  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- ── PAYMENT EVENTS LOG ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) NOT NULL,
  event_type     text NOT NULL,  -- e.g. retainer_paid, final_released, disputed
  actor_id       uuid,
  metadata       jsonb DEFAULT '{}',
  created_at     timestamptz DEFAULT now()
);

-- ── DISPUTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id   uuid REFERENCES transactions(id) NOT NULL,
  raised_by        uuid REFERENCES auth.users(id) NOT NULL,
  reason           text NOT NULL,
  status           text DEFAULT 'open',  -- open | resolved | closed
  resolution_notes text,
  created_at       timestamptz DEFAULT now(),
  resolved_at      timestamptz
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes       ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own transactions"
  ON transactions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Participants can view payment events"
  ON payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id
        AND (t.client_id = auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view own disputes"
  ON disputes FOR SELECT
  USING (raised_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can open disputes"
  ON disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_client   ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project  ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_txn    ON payment_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_txn          ON disputes(transaction_id);

-- ── VIOLATIONS (Strike system) ──────────────────────────────
CREATE TABLE IF NOT EXISTS violations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) NOT NULL,
  violation_type text NOT NULL,
  description    text,
  strike_number  integer NOT NULL,
  status         text DEFAULT 'active',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own violations"
  ON violations FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_violations_user ON violations(user_id);

-- ── MESSAGE FILTER EVENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_filter_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) NOT NULL,
  pattern_type text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE message_filter_events ENABLE ROW LEVEL SECURITY;

-- Only admins (service role) can read filter events
CREATE POLICY IF NOT EXISTS "Users can insert own filter events"
  ON message_filter_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_filter_events_user ON message_filter_events(user_id);

-- ── LOYALTY: completed_projects on creator_listings ──────────
ALTER TABLE creator_listings ADD COLUMN IF NOT EXISTS completed_projects integer DEFAULT 0;

-- ── CLIENT PROFILES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_profiles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name            text,
  phone                   text,
  company_name            text,
  tos_accepted_at         timestamptz,
  email_verified          boolean DEFAULT false,
  phone_verified          boolean DEFAULT false,
  payment_method_on_file  boolean DEFAULT false,
  spam_score              integer DEFAULT 0,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own client profile"
  ON client_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own client profile"
  ON client_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own client profile"
  ON client_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- ── VERIFICATION: columns on creator_listings ────────────────
ALTER TABLE creator_listings ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
ALTER TABLE creator_listings ADD COLUMN IF NOT EXISTS verification_steps  jsonb DEFAULT '{}';
