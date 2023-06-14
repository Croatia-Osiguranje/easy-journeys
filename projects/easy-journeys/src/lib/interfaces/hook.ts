import { Session } from '../models/session';

export interface Hook {
  id: string;
  apply(session: Session): Session;
}
