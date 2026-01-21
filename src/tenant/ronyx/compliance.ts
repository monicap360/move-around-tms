type RonyxComplianceConfig = {
  state: string;
  requirements: string[];
};

export class RonyxCompliance {
  static configure(config: RonyxComplianceConfig) {
    return {
      ...config,
      hasRequirement(requirement: string) {
        return config.requirements.includes(requirement);
      },
    };
  }
}
