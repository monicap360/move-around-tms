-- Supabase RLS Policies for MoveAround TMS Billing + Sales

-- 1. ORGANIZATIONS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- Org owner: can read/write their org
CREATE POLICY org_owner_select ON organizations
  FOR SELECT USING (auth.uid() = owner_id OR EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = organizations.id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY org_owner_update ON organizations
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY org_owner_insert ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 2. BILLING PAYMENTS
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_payments_select ON billing_payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = billing_payments.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY billing_payments_update ON billing_payments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = billing_payments.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY billing_payments_insert ON billing_payments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = billing_payments.organization_id AND user_seats.user_id = auth.uid()
  ));

-- 3. ADDONS ENABLED
ALTER TABLE addons_enabled ENABLE ROW LEVEL SECURITY;
CREATE POLICY addons_enabled_select ON addons_enabled
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = addons_enabled.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY addons_enabled_update ON addons_enabled
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = addons_enabled.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY addons_enabled_insert ON addons_enabled
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = addons_enabled.organization_id AND user_seats.user_id = auth.uid()
  ));

-- 4. SUBSCRIPTIONS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = subscriptions.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY subscriptions_update ON subscriptions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = subscriptions.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY subscriptions_insert ON subscriptions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = subscriptions.organization_id AND user_seats.user_id = auth.uid()
  ));

-- 5. SUBSCRIPTION HISTORY
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_history_select ON subscription_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = subscription_history.organization_id AND user_seats.user_id = auth.uid()
  ));
CREATE POLICY subscription_history_insert ON subscription_history
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.organization_id = subscription_history.organization_id AND user_seats.user_id = auth.uid()
  ));

-- 6. SETUP FEE TIERS (read-only, all users)
ALTER TABLE setup_fee_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY setup_fee_tiers_select ON setup_fee_tiers
  FOR SELECT USING (true);

-- 7. AGENTS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_self_select ON agents
  FOR SELECT USING (id = auth.uid());
CREATE POLICY agents_self_update ON agents
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY agents_self_insert ON agents
  FOR INSERT WITH CHECK (id = auth.uid());

-- 8. AGENT REFERRALS
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_referrals_self_select ON agent_referrals
  FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY agent_referrals_self_insert ON agent_referrals
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- 9. AGENT LEADS
ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_leads_self_select ON agent_leads
  FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY agent_leads_self_update ON agent_leads
  FOR UPDATE USING (agent_id = auth.uid());
CREATE POLICY agent_leads_self_insert ON agent_leads
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- 10. AGENT CONTACTS
ALTER TABLE agent_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_contacts_self_select ON agent_contacts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM agent_leads WHERE agent_leads.id = agent_contacts.lead_id AND agent_leads.agent_id = auth.uid()
  ));
CREATE POLICY agent_contacts_self_update ON agent_contacts
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM agent_leads WHERE agent_leads.id = agent_contacts.lead_id AND agent_leads.agent_id = auth.uid()
  ));
CREATE POLICY agent_contacts_self_insert ON agent_contacts
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM agent_leads WHERE agent_leads.id = agent_contacts.lead_id AND agent_leads.agent_id = auth.uid()
  ));

-- 11. AGENT COMMISSIONS
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_commissions_self_select ON agent_commissions
  FOR SELECT USING (agent_id = auth.uid());

-- 12. COMMISSION EVENTS
ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY commission_events_self_select ON commission_events
  FOR SELECT USING (agent_id = auth.uid());

-- 13. AGENT TASKS
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_tasks_self_select ON agent_tasks
  FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY agent_tasks_self_update ON agent_tasks
  FOR UPDATE USING (agent_id = auth.uid());
CREATE POLICY agent_tasks_self_insert ON agent_tasks
  FOR INSERT WITH CHECK (agent_id = auth.uid());

-- 14. AGENT MARKETING ASSETS (read-only, all users)
ALTER TABLE agent_marketing_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_marketing_assets_select ON agent_marketing_assets
  FOR SELECT USING (true);

-- 15. ADMIN SUPERUSER ACCESS (optional, for all tables)
-- Example: grant all to role 'admin'
-- CREATE POLICY admin_all_access ON organizations FOR ALL TO admin USING (true) WITH CHECK (true);
