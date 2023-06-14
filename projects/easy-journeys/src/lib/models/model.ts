export abstract class Model {
  loadModel(input: any) {
    Object.assign(this, input);
    return this;
  }
}
