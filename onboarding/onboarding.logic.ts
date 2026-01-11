// Core logic for onboarding progress
import { OnboardingStatus, OnboardingStep } from "./onboarding.types";
import { v4 as uuidv4 } from "uuid";

export function createInitialOnboardingStatus(
  user_id: string,
): OnboardingStatus {
  return {
    user_id,
    steps: {
      profile: false,
      documents: false,
      training: false,
      payment: false,
      compliance: false,
    },
    completed: false,
    last_updated: new Date().toISOString(),
  };
}

export function markStepComplete(
  status: OnboardingStatus,
  step: OnboardingStep,
): OnboardingStatus {
  const steps = { ...status.steps, [step]: true };
  const completed = Object.values(steps).every(Boolean);
  return {
    ...status,
    steps,
    completed,
    last_updated: new Date().toISOString(),
  };
}
