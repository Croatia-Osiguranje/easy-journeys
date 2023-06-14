import { StepInterface } from './step.interface';

export class PathConfig {
  id!: string;
  paths: Array<{ id: string; steps: Array<StepInterface> }> = [];
}
