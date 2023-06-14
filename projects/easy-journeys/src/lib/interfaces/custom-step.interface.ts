export interface CustomStep {
  instance: any;
  inputs?: [{ provide: string; useValue: any }];
  generateForms?: boolean;
}
