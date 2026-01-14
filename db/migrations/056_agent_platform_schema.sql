-- ============================================================================
-- AGENT PLATFORM SCHEMA
-- Organization-scoped AI agents with RLS enforcement
-- ============================================================================

-- 1. Agents Table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('resolution', 'ops', 'sales', 'growth', 'health', 'learning')),
  is_active boolean DEFAULT true,
  version text DEFAULT '1.0.0',
  description text,
  system_prompt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name, type)
);

-- 2. Agent Permissions
CREATE TABLE IF NOT EXISTS agent_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  can_read jsonb DEFAULT '{}'::jsonb, -- { "tables": ["tickets", "drivers"], "fields": ["id", "status"] }
  can_write jsonb DEFAULT '{}'::jsonb, -- { "tables": ["support_tickets"], "fields": ["title", "description"] }
  can_act boolean DEFAULT false, -- Can execute actions (not just draft)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id)
);

-- 3. Agent Conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  context jsonb DEFAULT '{}'::jsonb, -- { "page": "/tickets", "entity_id": "123", "entity_type": "ticket" }
  created_at timestamptz DEFAULT now()
);

-- 4. Agent Actions
CREATE TABLE IF NOT EXISTS agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL, -- "create_ticket", "update_status", "send_email", etc.
  payload jsonb NOT NULL, -- Action-specific data
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'executed')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Agent Knowledge Base
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = global knowledge
  category text NOT NULL, -- "troubleshooting", "onboarding", "features", "pricing"
  title text NOT NULL,
  content text NOT NULL,
  source text, -- "user_question", "documentation", "support_ticket"
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_org_type ON agents(organization_id, type, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_org_user ON agent_conversations(organization_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent ON agent_conversations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_org_status ON agent_actions(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_agent ON agent_actions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_org_category ON agent_knowledge(organization_id, category);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - MANDATORY ORGANIZATION SCOPING
-- ============================================================================

-- Agents: Only see agents from your organization
CREATE POLICY agents_org_isolation ON agents
  FOR ALL
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- Agent Permissions: Only see permissions for your org's agents
CREATE POLICY agent_permissions_org_isolation ON agent_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_permissions.agent_id
      AND (
        agents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

-- Agent Conversations: Only see conversations from your org + your own user conversations
CREATE POLICY agent_conversations_org_user_isolation ON agent_conversations
  FOR SELECT
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
      )
    )
  );

CREATE POLICY agent_conversations_insert ON agent_conversations
  FOR INSERT
  WITH CHECK (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    AND user_id = auth.uid()
  );

-- Agent Actions: Only see actions from your org
CREATE POLICY agent_actions_org_isolation ON agent_actions
  FOR ALL
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- Agent Knowledge: Org-specific knowledge + global knowledge (NULL org_id)
CREATE POLICY agent_knowledge_org_isolation ON agent_knowledge
  FOR SELECT
  USING (
    organization_id IS NULL -- Global knowledge
    OR organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY agent_knowledge_insert ON agent_knowledge
  FOR INSERT
  WITH CHECK (
    organization_id IS NULL
    OR organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's organization_id from JWT
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() ->> 'organization_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (auth.users.raw_user_meta_data->>'is_super_admin')::boolean,
    false
  )
  FROM auth.users
  WHERE auth.users.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agents IS 'Organization-scoped AI agents. Each agent belongs to one organization.';
COMMENT ON TABLE agent_permissions IS 'Fine-grained permissions for what each agent can read/write/act on.';
COMMENT ON TABLE agent_conversations IS 'Chat history between users and agents. Scoped by organization and user.';
COMMENT ON TABLE agent_actions IS 'Actions proposed by agents. Must be approved by humans before execution.';
COMMENT ON TABLE agent_knowledge IS 'Knowledge base for agents. Can be organization-specific or global.';

COMMENT ON COLUMN agent_actions.status IS 'draft: waiting approval, approved: ready to execute, rejected: user declined, executed: completed';
COMMENT ON COLUMN agent_knowledge.organization_id IS 'NULL = global knowledge available to all orgs, UUID = org-specific knowledge';
