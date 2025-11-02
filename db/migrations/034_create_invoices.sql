-- Migration 034: Invoice tracking and numbering
-- Purpose: Track generated invoices and quotes with sequential numbering

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  invoice_type text check (invoice_type in ('Quote','Invoice','Receipt')) default 'Invoice',
  quote_id uuid references public.aggregate_quotes(id) on delete set null,
  company text not null,
  contact_name text,
  contact_email text,
  billing_address text,
  line_items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,4) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) not null default 0,
  notes text,
  terms text,
  due_date date,
  status text default 'Draft' check (status in ('Draft','Sent','Paid','Overdue','Cancelled')),
  pdf_url text,
  signature_url text,
  signature_status text check (signature_status in ('Not Sent','Sent','Signed','Declined')),
  signature_provider text,
  signature_envelope_id text,
  sent_at timestamp,
  paid_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  created_by uuid
);

-- Invoice sequence for auto-numbering
create sequence if not exists invoice_number_seq start 1000;

-- Indexes
create index if not exists idx_invoices_company on public.invoices(company);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_quote_id on public.invoices(quote_id);
create index if not exists idx_invoices_invoice_number on public.invoices(invoice_number);
create index if not exists idx_invoices_due_date on public.invoices(due_date);

-- Comments
comment on table public.invoices is 'Generated invoices, quotes, and receipts with signature tracking';
comment on column public.invoices.line_items is 'JSONB array of {description, quantity, unit_price, amount}';
comment on column public.invoices.signature_envelope_id is 'DocuSign or HelloSign envelope/request ID';
comment on column public.invoices.invoice_number is 'Sequential invoice number (e.g., INV-1001, QUO-1002)';

-- Function to generate next invoice number
create or replace function generate_invoice_number(prefix text default 'INV')
returns text
language plpgsql
as $$
declare
  next_num int;
  inv_num text;
begin
  next_num := nextval('invoice_number_seq');
  inv_num := prefix || '-' || lpad(next_num::text, 4, '0');
  return inv_num;
end;
$$;

comment on function generate_invoice_number is 'Generate sequential invoice numbers with custom prefix';
