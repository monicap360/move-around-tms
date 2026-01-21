type RonyxBrandingConfig = {
  logo: string;
  colors: { primary: string; secondary: string };
  companyName: string;
};

export class RonyxBranding {
  static apply(config: RonyxBrandingConfig) {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--ronyx-primary",
        config.colors.primary,
      );
      document.documentElement.style.setProperty(
        "--ronyx-secondary",
        config.colors.secondary,
      );
      document.documentElement.style.setProperty(
        "--ronyx-company",
        config.companyName,
      );
    }
    return config;
  }
}
