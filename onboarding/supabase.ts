// Supabase integration for onboarding status
import { createClient } from '@supabase/supabase-js';
import { OnboardingStatus } from './onboarding.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchOnboardingStatus(user_id: string): Promise<OnboardingStatus | null> {
  const { data, error } = await supabase
    .from('onboarding_status')
    .select('*')
    .eq('user_id', user_id)
    .single();
  if (error) return null;
  return data as OnboardingStatus;
}

export async function upsertOnboardingStatus(status: OnboardingStatus) {
  const { data, error } = await supabase
    .from('onboarding_status')
    .upsert([status], { onConflict: ['user_id'] });
  if (error) throw error;
  return data;
}
