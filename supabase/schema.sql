-- Chair Time — Phase 1 schema (multi-tenant core, no payments yet)
-- Run this in the Supabase SQL Editor on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table salons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  timezone text not null default 'Africa/Johannesburg',
  created_at timestamptz not null default now()
);

create table salon_members (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (salon_id, user_id)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  category text not null,
  duration_minutes int not null,
  price_cents int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  specialty text,
  color text not null default '#2F4A3C',
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  service_id uuid references services(id),
  staff_id uuid references staff(id),
  date date not null,
  time time not null,
  duration_minutes int not null,
  customer_name text not null,
  customer_phone text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  payment_method text not null default 'cash',
  deposit_amount_cents int not null default 0,
  deposit_paid boolean not null default false,
  balance_due_cents int not null default 0,
  confirmation_code text not null,
  created_at timestamptz not null default now()
);

-- Reserved for Phase 2/3 — created now so the schema matches the build
-- spec, but left unused (and RLS-locked to salon members only) until the
-- payment provider integration is built.
create table salon_payment_connections (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  provider text not null,
  connected_account_id text,
  connected_at timestamptz,
  created_at timestamptz not null default now()
);

create table platform_subscriptions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  plan text not null default 'trial',
  status text not null default 'trialing',
  current_period_end timestamptz,
  provider_subscription_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helper function: is the current user a member of this salon?
-- SECURITY DEFINER so it can read salon_members regardless of the
-- caller's own RLS visibility into that table.
-- ---------------------------------------------------------------------

create or replace function is_salon_member(target_salon_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from salon_members
    where salon_id = target_salon_id and user_id = auth.uid()
  );
$$;

-- Auto-add the creator of a salon as its owner member.
create or replace function handle_new_salon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into salon_members (salon_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_salon_created
  after insert on salons
  for each row execute function handle_new_salon();

-- Make sure a booking's service/staff actually belong to the salon it's
-- being booked under (defense in depth — the public booking form should
-- never send mismatched ids, but don't rely on client-side code alone).
create or replace function validate_booking_consistency()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from services where id = new.service_id and salon_id = new.salon_id) then
    raise exception 'service does not belong to this salon';
  end if;
  if new.staff_id is not null and not exists (select 1 from staff where id = new.staff_id and salon_id = new.salon_id) then
    raise exception 'staff member does not belong to this salon';
  end if;
  return new;
end;
$$;

create trigger check_booking_consistency
  before insert on bookings
  for each row execute function validate_booking_consistency();

-- Returns booked time ranges for a staff member on a date, WITHOUT
-- exposing customer names/phone numbers to the public booking page.
-- The public page uses this instead of selecting from `bookings` directly.
create or replace function get_taken_slots(p_staff_id uuid, p_date date)
returns table(start_minutes int, duration_minutes int)
language sql
security definer
set search_path = public
as $$
  select
    (extract(hour from time)::int * 60 + extract(minute from time)::int) as start_minutes,
    duration_minutes
  from bookings
  where staff_id = p_staff_id and date = p_date and status = 'confirmed';
$$;

grant execute on function get_taken_slots(uuid, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------

alter table salons enable row level security;
alter table salon_members enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table bookings enable row level security;
alter table salon_payment_connections enable row level security;
alter table platform_subscriptions enable row level security;

-- salons: name/slug/timezone are not sensitive — the public booking page
-- needs to read a salon by slug, so this is openly readable.
create policy "salons are publicly readable" on salons
  for select using (true);

create policy "authenticated users can create a salon" on salons
  for insert with check (owner_id = auth.uid());

create policy "owner can update their salon" on salons
  for update using (owner_id = auth.uid());

-- salon_members: only visible to other members of the same salon.
create policy "members can view their salon's membership" on salon_members
  for select using (is_salon_member(salon_id));

create policy "salon owner can add members" on salon_members
  for insert with check (
    exists (select 1 from salons where id = salon_id and owner_id = auth.uid())
  );

-- services: salon staff manage them; the public booking page needs to
-- read active services to build the category/service picker.
create policy "members manage services" on services
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));

create policy "public can view active services" on services
  for select using (active = true);

-- staff: same pattern — members manage, public can view (needed for the
-- staff picker and skill-matching on the booking page).
create policy "members manage staff" on staff
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));

create policy "public can view staff" on staff
  for select using (true);

-- bookings: salon members can see/manage everything for their salon.
-- The public booking page can INSERT a new booking, but cannot SELECT —
-- availability is checked via get_taken_slots() instead, which never
-- returns customer details.
create policy "members manage salon bookings" on bookings
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));

create policy "public can create bookings" on bookings
  for insert with check (true);

-- Payment connections and platform subscriptions: salon-members-only,
-- no public access at all. Unused until Phase 2/3 build out, but locked
-- down from day one.
create policy "members manage payment connections" on salon_payment_connections
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));

create policy "members view their subscription" on platform_subscriptions
  for select using (is_salon_member(salon_id));
