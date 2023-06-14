
/**
 * Nonce goes alongside with Session and protects reload from session for a given period.
 * Its useful when you want to allow comming back to step only for given period
 */
export class Nonce {
  id: string;
  stepId: string;
  expires: number;

  constructor(stepId: string, expires: number) {
    this.id = crypto.randomUUID();
    this.stepId = stepId;
    this.expires = expires;
  }
}
