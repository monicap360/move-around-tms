// Types for onboarding automation
export type OnboardingStep =
  | 'profile'
  | 'documents'
  | 'training'
  | 'payment'
  | 'compliance';

export interface OnboardingStatus {
  user_id: string;
  steps: Record<OnboardingStep, boolean>;
  completed: boolean;
  last_updated: string;
}
