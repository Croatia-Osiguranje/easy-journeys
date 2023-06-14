import { JourneyValue } from '../models/journey-value';
import { CustomStep } from './custom-step.interface';
import { FieldInterface } from '@crosig/easy-forms';
import { NavigationInterface } from './navigation.interface';

export interface StepInterface {
  id: string;
  type: 'step' | 'customStep';
  component?: CustomStep;
  name: string;
  slug?: string;
  title: string;
  pageTitle: string;
  progressBarTitle: string;
  visible?: boolean | ((activeSteps: any) => boolean);
  description?: string;
  children: Array<FieldInterface>;
  apiData?: Array<JourneyValue>;
  browserNavigate?: boolean;
  valid?: boolean;
  progressBar?: boolean;
  changesUrl?: boolean;
  parentId?: string;
  canLoadFromSession?: boolean;
  protectLoadFromSession?: string;
  navigation?: NavigationInterface;
  path?: string;
  metaData?: any;
  returnToPreviousEnabled?: boolean;
  goToNextEnabled?: boolean;
}
