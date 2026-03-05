-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. profiles (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  phone text,
  full_name text,
  role text check (role in ('ADMIN', 'STORE_OWNER', 'STAFF', 'PLAYER')) default 'PLAYER',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- trigger to create a profile automatically when a user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'PLAYER'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. stores
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. branches
create table public.branches (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add references to profiles later to avoid circular dependencies
alter table public.profiles
  add column store_id uuid references public.stores(id) on delete set null,
  add column branch_id uuid references public.branches(id) on delete set null;

-- 4. tables
create table public.tables (
  id uuid default uuid_generate_v4() primary key,
  branch_id uuid references public.branches(id) on delete cascade not null,
  name_or_number text not null,
  status text check (status in ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')) default 'AVAILABLE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. pricing_rules
create table public.pricing_rules (
  id uuid default uuid_generate_v4() primary key,
  branch_id uuid references public.branches(id) on delete cascade not null,
  day_of_week integer[] not null, -- Array [0-6] where 0=Sunday
  start_time time not null,
  end_time time not null,
  hourly_rate numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. sessions (Core Engine)
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables(id) on delete cascade not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  status text check (status in ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')) default 'ACTIVE',
  hourly_rate_applied numeric not null,
  paused_duration_seconds integer default 0 not null,
  duration_minutes integer,
  total_amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. session_pauses (Sub-tracking)
create table public.session_pauses (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  paused_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resumed_at timestamp with time zone
);

-- 8. session_players
create table public.session_players (
  session_id uuid references public.sessions(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  split_percentage numeric default 100 not null,
  primary key (session_id, player_id)
);

-- 9. payments
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete set null,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  method text check (method in ('CASH', 'UPI', 'CARD', 'WALLET')) not null,
  status text check (status in ('SUCCESS', 'FAILED', 'PENDING')) default 'SUCCESS',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. dues
create table public.dues (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete set null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  status text check (status in ('PENDING', 'SETTLED')) default 'PENDING',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. wallet_transactions
create table public.wallet_transactions (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null, -- Positive for CREDIT, Negative for DEBIT
  type text check (type in ('DEPOSIT', 'WITHDRAWAL', 'SESSION_PAYMENT', 'REFUND')) not null,
  reference_id uuid, -- Link to payment_id or session_id
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Setup (MVP basic rules)
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.branches enable row level security;
alter table public.tables enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.sessions enable row level security;
alter table public.session_pauses enable row level security;
alter table public.session_players enable row level security;
alter table public.payments enable row level security;
alter table public.dues enable row level security;
alter table public.wallet_transactions enable row level security;

-- For MVP, backend handles heavy lifting (Bypasses RLS utilizing Service Role Key)
-- Allow authenticated users to read profiles
create policy "Allow logged-in users to read profiles" on public.profiles for select using ( auth.role() = 'authenticated' );
create policy "Users can update own profile" on public.profiles for update using ( auth.uid() = id );

-- Optional: You can create stricter RLS later, but for the MVP, the Express server 
-- will be doing the secure writing, and the frontend will mostly do read operations or
-- call the Express server for mutations.

-- 12. RPC for Secure Session Ending and Payment
create or replace function public.end_session_transaction(
  p_session_id uuid,
  p_total_amount numeric,
  p_payments jsonb, -- array of { payer_id, amount, method }
  p_dues jsonb      -- array of { player_id, amount }
) returns void as $$
declare
  _ended_at timestamp with time zone := now();
  _started_at timestamp with time zone;
  _paused_duration integer;
  _duration_minutes integer;
  _payment record;
  _due record;
begin
  -- 1. Lock and update session
  update public.sessions
  set status = 'COMPLETED',
      ended_at = _ended_at,
      total_amount = p_total_amount
  where id = p_session_id and status != 'COMPLETED'
  returning started_at, paused_duration_seconds into _started_at, _paused_duration;

  if not found then
    raise exception 'Session not found or already completed';
  end if;

  -- Update duration_minutes based on actual time
  _duration_minutes := extract(epoch from (_ended_at - _started_at)) / 60;
  _duration_minutes := greatest(0, _duration_minutes - coalesce((_paused_duration / 60), 0));

  update public.sessions
  set duration_minutes = _duration_minutes
  where id = p_session_id;

  -- 2. Insert Payments
  if p_payments is not null then
    for _payment in select * from jsonb_to_recordset(p_payments) as x(payer_id uuid, amount numeric, method text) loop
      insert into public.payments (session_id, payer_id, amount, method, status)
      values (p_session_id, _payment.payer_id, _payment.amount, _payment.method, 'SUCCESS');
      
      -- 3. Handle Wallet Deductions if method is WALLET
      if _payment.method = 'WALLET' then
        insert into public.wallet_transactions (player_id, amount, type, reference_id)
        values (_payment.payer_id, -_payment.amount, 'SESSION_PAYMENT', p_session_id);
      end if;
    end loop;
  end if;

  -- 4. Insert Dues
  if p_dues is not null then
    for _due in select * from jsonb_to_recordset(p_dues) as x(player_id uuid, amount numeric) loop
      insert into public.dues (session_id, player_id, amount, status)
      values (p_session_id, _due.player_id, _due.amount, 'PENDING');
    end loop;
  end if;

end;
$$ language plpgsql security definer;
