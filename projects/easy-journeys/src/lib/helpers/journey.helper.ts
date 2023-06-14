import { StepInterface } from '../interfaces/step.interface';

export class JourneyHelper {
  public static createPath(pathId: string, steps: Array<StepInterface>): Array<StepInterface> {
    return steps.map((stepConfig) => {
      return { ...stepConfig, path: pathId };
    });
  }
}
