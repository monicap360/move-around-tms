-- Add issued_on (contract start / effective date) to OO documents
ALTER TABLE public.ronyx_oo_documents
  ADD COLUMN IF NOT EXISTS issued_on date;

COMMENT ON COLUMN public.ronyx_oo_documents.issued_on IS 'Contract start / effective date — for multi-year contracts the period is issued_on → expires_on';
