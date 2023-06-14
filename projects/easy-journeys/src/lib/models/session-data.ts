import { Model } from './model';
import { History } from './history';

export class SessionData extends Model {
  models: any = {};
  history: History = new History();
  steps: any = {};
}
