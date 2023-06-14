import { Model } from './model';

/**
 * Configuration for saveCurrentStep function
 */
export class SaveStepOptions extends Model {
  valid?: boolean = false;
  saveSession?: boolean = true;
}
