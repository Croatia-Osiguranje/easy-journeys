import { SessionData } from './session-data';

export class Session {
  id?: string;
  application!: string;
  journey!: string;
  data: SessionData;
  models: any = {};

  constructor() {
    this.data = new SessionData();
  }
}
