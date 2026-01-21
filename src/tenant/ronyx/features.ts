export type RonyxFeatureSetup = {
  enabled: string[];
  disabled?: string[];
};

export type RonyxFeatureFlags = Record<string, boolean>;

export class RonyxFeatureManager {
  static setup(setup: RonyxFeatureSetup): RonyxFeatureFlags {
    const flags: RonyxFeatureFlags = {};
    setup.enabled.forEach((feature) => {
      flags[feature] = true;
    });
    (setup.disabled || []).forEach((feature) => {
      flags[feature] = false;
    });
    return flags;
  }
}
