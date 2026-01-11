# Onboarding Automation Module

## Overview

This module provides a reusable onboarding checklist and logic for tracking customer/driver onboarding progress. It integrates with Supabase for status storage and is ready for step-by-step flows.

## Key Files

- `onboarding.types.ts`: Types for onboarding steps and status
- `onboarding.logic.ts`: Core logic for onboarding progress
- `supabase.ts`: Supabase integration for onboarding status
- `OnboardingChecklist.tsx`: UI component for onboarding progress
- `app/onboarding/page.tsx`: Main onboarding page for users

## Next Steps

- Add forms and actions for each onboarding step (profile, documents, training, payment, compliance)
- Connect onboarding to billing and compliance enforcement
- Add admin dashboard for onboarding status
