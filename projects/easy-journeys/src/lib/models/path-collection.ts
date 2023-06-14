export class PathCollection {
  id!: string;
  private paths: Array<string> = [];

  getPaths() {
    return this.paths;
  }

  addPath(pathId: string) {
    this.paths.push(pathId);
  }

  hasPath(pathId: string): boolean {
    return this.paths.includes(pathId);
  }
}
