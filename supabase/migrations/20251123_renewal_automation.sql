-- Supabase trigger: automate renewal logic for MoveAround TMS
-- When a billing_payment is approved for subscription, extend paid_until and activate base_plan

create or replace function handle_subscription_renewal()
returns trigger as $$
begin
  -- Only run for approved subscription payments
  if (new.status = 'approved' and new.type = 'subscription') then
    update organizations
      set paid_until = coalesce(
            case when paid_until > current_date then paid_until else current_date end,
            current_date
          ) + interval '30 days',
          base_plan_active = true
      where id = new.organization_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Attach trigger to billing_payments
create trigger subscription_renewal_trigger
  after update on billing_payments
  for each row
  when (old.status is distinct from new.status)
  execute procedure handle_subscription_renewal();

-- Optional: expire base_plan when paid_until passes
create or replace function handle_subscription_expiry()
returns trigger as $$
begin
  if (new.paid_until < current_date) then
    update organizations set base_plan_active = false where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger subscription_expiry_trigger
  after update on organizations
  for each row
  when (old.paid_until is distinct from new.paid_until)
  execute procedure handle_subscription_expiry();
