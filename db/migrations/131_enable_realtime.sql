-- Enable Supabase Realtime on Ronyx tables
-- This allows every connected browser to receive live updates when any user makes a change.

ALTER PUBLICATION supabase_realtime ADD TABLE public.ronyx_owner_operators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ronyx_oo_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ronyx_oo_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ronyx_oo_trucks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ronyx_oo_drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_imports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_guard_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_import_batches;
