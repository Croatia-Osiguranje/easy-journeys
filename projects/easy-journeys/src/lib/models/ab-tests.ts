export class ABTestsHelper {
  config: any;
  fallback: any;

  constructor(config: any, fallback: any[]) {
    this.config = config;
    this.fallback = fallback;
  }

  getSteps(): Array<any> {
    return this.switchVersion(this.config, this.fallback);
  }

  private switchVersion(config: { selectedVersion: string; tests: any[] }, fallback: any) {
    if (!config.selectedVersion) {
      return fallback;
    }

    const steps = config.tests.find((test: { version: any }) => test.version === config.selectedVersion);

    if (steps) {
      return steps.steps;
    }

    return this.enrichStepsWithTestVersion(fallback, config.selectedVersion);
  }

  private enrichStepsWithTestVersion(steps: any[], version: string) {
    return steps.map((step: { abTestVersion: string }) => {
      step.abTestVersion = version;
      return step;
    });
  }
}
