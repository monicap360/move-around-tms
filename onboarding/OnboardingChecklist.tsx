// Reusable onboarding checklist UI
import { useEffect, useState } from "react";
import { OnboardingStatus, OnboardingStep } from "./onboarding.types";
import { fetchOnboardingStatus, upsertOnboardingStatus } from "./supabase";

const STEP_LABELS: Record<OnboardingStep, string> = {
  profile: "Complete Profile",
  documents: "Upload Documents",
  training: "Complete Training",
  payment: "Submit Payment",
  compliance: "Acknowledge Compliance",
};

export default function OnboardingChecklist({ user_id }: { user_id: string }) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnboardingStatus(user_id)
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [user_id]);

  if (loading) return <div>Loading onboarding…</div>;
  if (!status) return <div>Onboarding not started.</div>;

  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-lg font-bold mb-4">Onboarding Progress</h2>
      <ul className="space-y-2">
        {Object.entries(status.steps).map(([step, done]) => (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`w-4 h-4 rounded-full ${done ? "bg-green-500" : "bg-gray-300"}`}
            ></span>
            <span>{STEP_LABELS[step as OnboardingStep]}</span>
          </li>
        ))}
      </ul>
      {status.completed && (
        <div className="mt-4 text-green-700 font-semibold">
          Onboarding Complete!
        </div>
      )}
    </div>
  );
}
