-- Migration 035: Account plan (feature tier)
-- Single-tenant plan tracking; extend to multi-tenant as needed

create table if not exists public.account_plan (
  id uuid primary key default gen_random_uuid(),
  plan text not null check (plan in ('Basic','Pro','Enterprise')) default 'Basic',
  updated_at timestamp default now()
);

-- ensure only one row (simple guard via unique partial index on true)
create unique index if not exists ux_account_plan_singleton on public.account_plan((true));

-- seed default row if empty
insert into public.account_plan(plan)
select 'Basic'
where not exists (select 1 from public.account_plan);
