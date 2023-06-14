import { Field, FormHelper } from '@crosig/easy-forms';
import { ActiveStepsCollection } from '../models/active-steps.collection';
import { JourneyConfig } from '../models/journey.config';
import { Session } from '../models/session';
import { Step } from '../models/step';
import { DataHelper } from './data.helper';

export class SessionHelper {
  /**
   * Retrieves all values from activeSteps collection and prepares them for storing in Session
   * @returns Session
   */
  public static prepareForBackend(activeSteps: ActiveStepsCollection, config: JourneyConfig): Session {
    const session = new Session();
    const steps = activeSteps.all();

    session.data.steps = steps.reduce((accumulator: any, step: Step) => {
      const flattenLeafControls: any[] = [];
      FormHelper.whenLeaf(step.children, (field: Field) => {
        flattenLeafControls.push(field);
      });

      const children = flattenLeafControls.reduce((childAcumulator, field: Field) => {
        childAcumulator[field.id] = field.value;
        return childAcumulator;
      }, {});

      if (!step.apiData) {
        return;
      }

      const apiData = DataHelper.valuesToObject(step.apiData);
      accumulator[step.id] = {
        valid: step.valid,
        values: { ...children, ...apiData },
      };
      return accumulator;
    }, {});

    session.data.models = activeSteps.getModels();
    session.data.history = activeSteps.getHistory();
    session.application = config.application;
    session.journey = config.journey;
    return session;
  }
}
