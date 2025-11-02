-- ==================================================
-- Migration: Seed Martin Marietta aggregate partner
-- ==================================================

-- Insert Martin Marietta with OCR regex patterns
insert into public.aggregate_partners (
  name,
  email_domain,
  regex_patterns,
  pay_rate,
  bill_rate,
  material_codes,
  active
)
values (
  'Martin Marietta',
  '@martinmarietta.com',
  '{
    "ticket_no": "Ticket\\\\s*#\\\\s*(\\\\w+)",
    "tons": "(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*TONS",
    "plant": "Plant\\\\s*#\\\\s*(\\\\d+)",
    "material": "Material\\\\s*:\\\\s*([^\\\\n]+)",
    "date": "Date\\\\s*:\\\\s*(\\\\d{1,2}\\\\/\\\\d{1,2}\\\\/\\\\d{2,4})",
    "company_hint": "Martin Marietta|MM Aggregates|Martin\\\\s*Marietta"
  }',
  25.00,
  35.00,
  '{
    "57 Stone": {"pay_rate": 26.00, "bill_rate": 36.00},
    "67 Stone": {"pay_rate": 26.00, "bill_rate": 36.00},
    "Clean Stone": {"pay_rate": 27.00, "bill_rate": 38.00},
    "ABC": {"pay_rate": 24.00, "bill_rate": 34.00}
  }',
  true
)
on conflict (name) do update set
  email_domain = excluded.email_domain,
  regex_patterns = excluded.regex_patterns,
  pay_rate = excluded.pay_rate,
  bill_rate = excluded.bill_rate,
  material_codes = excluded.material_codes,
  active = excluded.active;

comment on table public.aggregate_partners is 'Configure OCR patterns and rates per aggregate supplier/quarry';
