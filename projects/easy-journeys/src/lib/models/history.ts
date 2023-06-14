import { Model } from './model';
import { SelectedPathsInterface } from '../interfaces/selected-paths.interface';

export class History extends Model {
  full: Array<string> = [];
  passedSteps: Array<string> = [];
  private selectedPaths: Array<SelectedPathsInterface> = [];

  add(step: any) {
    this.full.push(step.id);
    if (!this.passedSteps.includes(step.id)) {
      this.passedSteps.push(step.id);
    }
  }

  get() {
    return {
      full: this.full,
      passedSteps: this.passedSteps,
      paths: this.selectedPaths,
    };
  }

  savePath(stepId: string, pathId: string, collectionId: string) {
    this.selectedPaths.push({
      stepId,
      pathId,
      collectionId,
    });
  }

  getPaths(): Array<any> {
    return this.selectedPaths;
  }

  hasPaths(): boolean {
    return this.selectedPaths.length > 0;
  }

  removePath(stepId: string): void {
    this.selectedPaths = this.selectedPaths.filter((record) => record.stepId !== stepId);
  }

  removePaths(paths: Array<string>) {
    this.selectedPaths = this.selectedPaths.filter((record) => !paths.includes(record.pathId));
  }
}
