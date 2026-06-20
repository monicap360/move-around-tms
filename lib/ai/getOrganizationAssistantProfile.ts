/**
 * getOrganizationAssistantProfile
 *
 * Returns the merged assistant profile for an org: catalog capabilities + org custom branding.
 * Backend AI tasks MUST route by assistant_key — never by display_name or custom_name.
 *
 * Usage:
 *   const profile = await getOrganizationAssistantProfile(supabase, orgId, "rory");
 *   // profile.display_name might be "Big Mike" but profile.assistant_key is always "rory"
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ASSISTANT_CATALOG,
  AssistantKey,
  AvatarStyle,
  ToneOption,
  buildPromptIdentityWrapper,
  getCatalogEntry,
} from "./assistantCatalog";

export interface AssistantProfile {
  assistant_key:        AssistantKey;
  default_name:         string;
  display_name:         string;
  role_title:           string;
  description:          string;
  avatar_style:         AvatarStyle;
  greeting:             string | null;
  tone:                 ToneOption;
  is_enabled:           boolean;
  locked_capabilities:  string[];
  permission_boundaries: string[];
  prompt_identity:      string;
}

export async function getOrganizationAssistantProfile(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  organizationId: string,
  assistantKey: AssistantKey,
): Promise<AssistantProfile | null> {
  const catalog = getCatalogEntry(assistantKey);
  if (!catalog) return null;

  const { data: row } = await supabase
    .from("organization_ai_assistants")
    .select("custom_name, avatar_style, greeting, tone, is_enabled")
    .eq("organization_id", organizationId)
    .eq("assistant_key", assistantKey)
    .single();

  const display_name  = (row?.custom_name as string | null) || catalog.default_name;
  const avatar_style  = ((row?.avatar_style as AvatarStyle) || catalog.default_avatar_style) as AvatarStyle;
  const tone          = ((row?.tone as ToneOption) || "professional") as ToneOption;
  const is_enabled    = row?.is_enabled !== false;
  const greeting      = (row?.greeting as string | null) || null;

  return {
    assistant_key:        catalog.assistant_key,
    default_name:         catalog.default_name,
    display_name,
    role_title:           catalog.role_title,
    description:          catalog.description,
    avatar_style,
    greeting,
    tone,
    is_enabled,
    locked_capabilities:  catalog.locked_capabilities,
    permission_boundaries: catalog.permission_boundaries,
    prompt_identity: buildPromptIdentityWrapper({
      display_name,
      assistant_key: catalog.assistant_key,
      role_title:    catalog.role_title,
      tone,
    }),
  };
}

export async function getAllOrganizationAssistantProfiles(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  organizationId: string,
): Promise<AssistantProfile[]> {
  const { data: rows } = await supabase
    .from("organization_ai_assistants")
    .select("assistant_key, custom_name, avatar_style, greeting, tone, is_enabled")
    .eq("organization_id", organizationId);

  const rowMap = new Map<string, any>();
  for (const r of (rows || [])) rowMap.set(r.assistant_key, r);

  return ASSISTANT_CATALOG.map(catalog => {
    const row   = rowMap.get(catalog.assistant_key);
    const display_name = (row?.custom_name as string | null) || catalog.default_name;
    const avatar_style = ((row?.avatar_style as AvatarStyle) || catalog.default_avatar_style) as AvatarStyle;
    const tone         = ((row?.tone as ToneOption) || "professional") as ToneOption;
    const is_enabled   = row?.is_enabled !== false;
    const greeting     = (row?.greeting as string | null) || null;

    return {
      assistant_key:        catalog.assistant_key,
      default_name:         catalog.default_name,
      display_name,
      role_title:           catalog.role_title,
      description:          catalog.description,
      avatar_style,
      greeting,
      tone,
      is_enabled,
      locked_capabilities:  catalog.locked_capabilities,
      permission_boundaries: catalog.permission_boundaries,
      prompt_identity: buildPromptIdentityWrapper({
        display_name,
        assistant_key: catalog.assistant_key,
        role_title:    catalog.role_title,
        tone,
      }),
    };
  });
}
