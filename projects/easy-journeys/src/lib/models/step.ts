import isFunction from 'lodash-es/isFunction';
import { Field } from '@crosig/easy-forms';
import { ArrayHelper } from '../helpers/array.helper';
import { JourneyValue } from './journey-value';
import { ActiveStepsCollection } from './active-steps.collection';
import { Navigation } from './navigation';
import { CustomStep } from '../interfaces/custom-step.interface';
import { StepInterface } from '../interfaces/step.interface';
import cloneDeep from 'lodash-es/cloneDeep';

import { DataHelper } from '../helpers/data.helper';
import { Model } from './model';

export class Step extends Model {
  /**
   * Unique step id
   */
  id!: string;

  /**
   * Step type
   * #step is for generic step or #stepName for example: vehicle
   */
  type!: string;

  /**
   * Step component
   * #component instance where step wil be displayed. Applied if type value is not step
   */
  component!: CustomStep;

  /**
   * Step name
   */
  name!: string;

  /**
   * Slug of the current step. For loading steps through route
   */
  slug!: string;

  /**
   * Title for the <title> HTML tag in body
   */
  title!: string;

  /**
   * Main title of the step
   */
  pageTitle!: string;

  /**
   * Title of the step for the progress bar
   */
  progressBarTitle!: string;

  /**
   * Property indicates if some step should be visible or not
   */
  visible: boolean | ((activeSteps: any) => boolean) = true;

  /**
   * Step description
   */
  description = '';

  /**
   * Children right now supports only Fields in
   * future it should support Step object as well.
   */
  children!: Array<Field>;

  /**
   * Property holds all responses from API services that can be
   * reused through Journey
   */
  apiData?: Array<JourneyValue> = [];

  /**
   * Holds iformation if step is loaded through browser refresh/direct hit or by Angular router
   */
  browserNavigate!: boolean;

  /**
   * Property holds information if step is valid or not
   */
  valid = false;

  /**
   * For the steps that are displayed in progressBar
   */
  progressBar = false;

  /**
   * For the steps that do not load form URL
   */
  changesUrl = true;

  /**
   * Parent step of the current step
   */
  parentId?: string;

  /**
   * Indicates if this step can be loaded from session
   * When this step is loaded session is created in localstorage if not already present
   */
  canLoadFromSession = false;

  /**
   * Indicates if this step session reload should be protected by nonce
   * Reload can be protected by various technics. Right now only nonce is available
   * When protected by nonce, step reload from session is posible only if nonce exists and has not expired
   */
  protectLoadFromSession!: string;

  /**
   * property holding navigation configuration
   */
  navigation: Navigation = new Navigation();

  /**
   * String indicating witch path(group) of steps the current step config belongs to.
   * When the user comes to a step where the journey branches into more than one path
   * It is recomended to use path feature, because journey dinamicaly inserts and removes
   * paths witch in large journeys can improve performance.
   */
  path!: string;

  /**
   * Holds AB test version so the step inner logic (controls, etc) can adjust depending on version
   */
  abTestVersion = '';

  /**
   * holds specific step configuration that can be used in custom step or to provide
   * different layout behaviour
   */
  metaData: any;

  /**
   * Initial config stored to enable reseting step and child controls
   * to initial state
   */
  initialConfig!: StepInterface;

  /**
   * Indicates if customer can return on previous steps
   * to initial state
   */
  returnToPreviousEnabled = true;

  /**
   * Indicates if customer can switch to next steps
   * to initial state
   */
  goToNextEnabled = true;

  override loadModel(input: any): this {
    Object.assign(this, input);
    if (input.navigation) {
      this.navigation = new Navigation().loadModel(input.navigation);
    }

    this.initialConfig = cloneDeep(input);

    return this;
  }

  getChildById(id: string) {
    return ArrayHelper.findNested(this.children, id);
  }

  /**
   * shorthand for getChildById
   * @param id field Id
   */
  get(id: string) {
    return this.getChildById(id);
  }

  getApiData(id: string): any {
    return DataHelper.getApiDataValue(id, this);
  }

  /**
   * Calculates weather step should be visible
   * @param activeSteps ActiveStepsCollection
   * @returns boolean
   */
  isVisible(activeSteps: ActiveStepsCollection): boolean {
    if (isFunction(this.visible)) {
      const customVisibleFunction = this.visible as (activeSteps: any) => boolean;
      return customVisibleFunction(activeSteps) as boolean;
    }
    return this.visible as boolean;
  }
}
