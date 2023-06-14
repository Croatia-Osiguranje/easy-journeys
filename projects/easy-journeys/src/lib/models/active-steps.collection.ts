import { Step } from './step';
import { Session } from './session';
import { Field, FormHelper, FormValue, ModelsConfig } from '@crosig/easy-forms';
import { DataHelper } from '../helpers/data.helper';
import { JourneyValue } from './journey-value';
import { JourneyError } from '../exceptions/journey.exception';
import cloneDeep from 'lodash-es/cloneDeep';
import set from 'lodash-es/set';
import unset from 'lodash-es/unset';
import get from 'lodash-es/get';
import { History } from './history';
import { StepInterface } from '../interfaces/step.interface';

import { ArrayHelper } from '../helpers/array.helper';
import { PathCollection } from './path-collection';
import { JourneyHelper } from '../helpers/journey.helper';
import { SelectedPathsInterface } from '../interfaces/selected-paths.interface';

/**
 * Collection class that handles all possible actions
 * on active steps loaded in Journey
 */
export class ActiveStepsCollection {
  private currentStepIndex = 0;
  private currentStep!: Step;
  private activeSteps: Array<Step>;
  private history = new History();
  private stepsConfig: Array<StepInterface> = [];
  private pathGroups: Array<PathCollection> = [];
  private models: any = {};

  constructor(
    steps: Array<StepInterface>,
    session: Session | null = null,
    options: { includePath: boolean; paths?: Array<any> } = { includePath: false, paths: [] }
  ) {
    this.stepsConfig = steps;

    if (options.paths) {
      this.initializePaths(options.paths);
    }

    this.activeSteps = this.loadSteps(steps, options);

    if (!session) {
      return;
    }

    this.models = session.data.models;
    this.history = new History().loadModel(session.data.history);

    if (this.history.hasPaths()) {
      this.reconstructPathsSelectionFromSession();
    }

    this.activeSteps = this.fillActiveStepsWithSessionData(this.activeSteps, session);

    // Checks for duplicated ids between apiData and fields
    this.validate(this.activeSteps);
  }

  fillActiveStepsWithSessionData(activeSteps: Array<Step>, session: Session): Array<Step> {
    activeSteps = activeSteps.map((step) => {
      step.valid = session.data.steps[step.id].valid;
      return step;
    });

    // Extract fields from session and batchInsert them in active steps
    const fields = [];
    for (const stepId of Object.keys(session.data.steps)) {
      const stepData = session.data.steps[stepId];
      for (const [key, value] of Object.entries(stepData.values)) {
        fields.push({ id: key, value: value });
      }
    }

    return DataHelper.batchInsert(fields, activeSteps);
  }

  private initializePaths(paths: any) {
    paths.forEach((pathGroup: any) => {
      pathGroup.paths.forEach((path: any) => {
        this.addPath(path.id, path.steps, pathGroup.id);
      });
    });
  }

  loadSteps(steps: Array<StepInterface>, options: any) {
    let stepsConfig = cloneDeep(steps);

    if (!options.includePath) {
      stepsConfig = stepsConfig.filter((stepConfig: any) => !stepConfig.hasOwnProperty('path'));
    }

    const activeSteps: Array<Step> = stepsConfig.map((stepConfig: any) => {
      const step = new Step().loadModel(stepConfig);
      step.children = FormHelper.loadChildren(step.children);
      return step;
    });

    return activeSteps;
  }

  reconstructPathsSelectionFromSession() {
    this.history.getPaths().forEach((pathSelection: SelectedPathsInterface) => {
      const filteredSteps = this.stepsConfig.filter((stepConfig) => stepConfig.path === pathSelection.pathId);
      const stepsId = filteredSteps.map((step) => step.id);
      this.insertAfter(pathSelection.stepId, stepsId);
    });
  }

  /**
   * Finds next step in Journey.
   * If cant find step returns undefined
   */
  getNext(): Step | undefined {
    let nextStep: Step;
    let nextIndex = this.currentStepIndex;
    do {
      nextIndex += 1;
      nextStep = this.activeSteps[nextIndex];
    } while (nextStep && !nextStep.isVisible(this));

    if (nextIndex >= this.activeSteps.length) {
      return undefined;
    }

    return nextStep;
  }

  /**
   * Extracts values from steps for given class and populates values
   * @param className Class constructor
   * @param includeEmpty Weather to include properties that have no value
   */
  getValuesByModel<T>(className: any, includeEmpty = false, mapper: any = null): T {
    return DataHelper.extractModel<T>(className, this.all(), includeEmpty, mapper);
  }

  /**
   * Looks for value in apiData or field.value of all steps
   * @param fieldId Id of the field/apiData or path to the field/apiData (ex. subform.subform.someField.object.value) or you can go directly to someField.object.value
   * @Note: it cannot return whole subform object, only field.value
   */
  getValueById(fieldId: string) {
    return DataHelper.findById(fieldId, this.all());
  }

  /**
   * Finds previous step in Journey.
   * If cant find step returns undefined
   */
  getPrevious(): Step | undefined {
    let previousStep: Step;
    let previousIndex = this.currentStepIndex;
    do {
      previousIndex -= 1;
      previousStep = this.activeSteps[previousIndex];
    } while (previousStep && !previousStep.isVisible(this));

    if (previousIndex < 0) {
      return;
    }
    return previousStep;
  }

  /**
   * Find first previous step that has 'changesUrl: true' and 'visible: true'
   */
  getPreviousWithUrl(currentSlug?: string) {
    const currentStepId = currentSlug ? this.getStepBySlug(currentSlug)?.id : this.currentStep?.id;
    if (!currentStepId) {
      return;
    }
    return this.activeSteps
      .slice(0, this.getStepIndexById(currentStepId))
      .reverse()
      .find((step) => step.changesUrl && step.isVisible(this));
  }

  /**
   * Retrives first step from ActiveSteps
   * @returns Step
   */
  getFirst(): Step {
    return this.activeSteps[0];
  }

  /**
   * Retrives current step from collection
   */
  getCurrentStep(): Step {
    return this.currentStep;
  }

  /**
   * Returns activeSteps array
   * @returns Array<Step>
   */
  all(): Array<Step> {
    return this.activeSteps;
  }

  /**
   * Returns step by Slug from available loaded steps
   * @param slug Url slug
   */
  getStepBySlug(slug: string): Step | undefined {
    return this.activeSteps.find((step) => step.slug === slug);
  }

  /**
   * Finds step by given id or returns undefined
   * @param id step id
   */
  getStepById(id: string): Step | undefined {
    return this.activeSteps.find((step: Step) => id === step.id);
  }

  /**
   * Sets provided step to be current
   * @param step Step to set as a current
   */
  setCurrentStep(step: Step): void {
    this.history.add(step);
    this.currentStep = step;
    this.currentStepIndex = this.getStepIndexById(this.currentStep.id);
  }

  /**
   * Checks if provided step is first step
   * @param step Step object from active steps
   * @returns boolean
   */
  isFirst(step: Step): boolean {
    return this.getFirst().id === step.id;
  }

  /**
   * Retrives step index by stepId
   * @param stepId id of the step
   */
  getStepIndexById(stepId: string): number {
    return this.activeSteps.findIndex((step) => step.id === stepId);
  }

  /**
   * Checks if all steps before given step are valid
   * @param step Step instance
   */
  stepsBeforeAreValid(step: Step): boolean {
    const stepToLoadIndex = this.getStepIndexById(step.id);
    const arrayToCheck = this.activeSteps.slice(0, stepToLoadIndex).filter((_step) => _step.isVisible(this));
    return arrayToCheck.every((_step) => _step.valid);
  }

  /**
   * Finds first invalid step in collection and returns it
   * Returns undefined if not found
   */
  getFirstInvalidStep(): Step | undefined {
    return this.activeSteps.find((step) => step.valid !== true);
  }

  /**
   * Function that saves form data to step in a journey with provided id
   * @param id current step id
   * @param values Key value pair to save step data to current step
   * @param valid is the step valid (Form is valid and API data is valid)
   */
  saveStep(id: string, values: FormValue, valid = false): Step {
    const currentStepIndex = this.getStepIndexById(id);
    const step = this.activeSteps[currentStepIndex];
    this.saveFieldValue(values, step);
    step.valid = valid;
    return step;
  }

  private saveFieldValue(values: FormValue, step: Step) {
    Object.keys(values).forEach((key) => {
      const field: Field = step.getChildById(key);
      if (!field) {
        return;
      }
      field.value = values[key];
      if (field.models) {
        this.saveToModel(field.models, field.value);
      }
    });
  }

  /**
   * Saves API data to step with provided stepId
   * @param stepId stepId to save API data to
   * @param fields key value pair of data to save
   */
  saveApiData(stepId: string, fields: any, resetMissing = false) {
    const currentStepIndex = this.getStepIndexById(stepId);
    const step = this.activeSteps[currentStepIndex];
    step?.apiData?.forEach((item) => {
      if (resetMissing) {
        item.value = fields.hasOwnProperty(item.id) ? fields[item.id] : '';
        return;
      }

      if (fields.hasOwnProperty(item.id)) {
        item.value = fields[item.id];
      }
    });
  }

  /**
   * Saves fields to step with provided stepId
   * @param stepId Step id
   * @param fields Fields to be saved as object
   * @param resetMissing flag that indicates if the values that are not listed should be reset to ''
   */
  saveFields(stepId: string, fields: any, resetMissing = false) {
    const step = this.getStepById(stepId);

    step?.children.forEach((item) => {
      if (resetMissing) {
        item.value = fields.hasOwnProperty(item.id) ? fields[item.id] : '';
        return;
      }

      if (fields.hasOwnProperty(item.id)) {
        item.value = fields[item.id];
      }
    });
  }

  /**
   * Changes the visible value for given field and step
   *
   * @todo it would be nice if control could also be disabled/enabled and reset.
   *
   * @param stepId StepId to changeVisibility
   * @param fieldId FieldId to changeVisibility property
   * @param visible property value
   */
  setFieldVisibility(stepId: string, fieldId: string, visible: boolean): boolean {
    const step = this.getStepById(stepId);
    if (!step) {
      return false;
    }
    const field = ArrayHelper.findNested(step?.children, fieldId);

    if (!field) {
      return false;
    }

    field.visible = visible;

    return true;
  }

  /**
   * Retreives apiData for given Step
   * @param stepId Id of the step to retreive apiData for
   */
  getApiData(stepId: string): Array<JourneyValue> {
    const step = this.getStepById(stepId);

    if (!step) {
      throw new JourneyError(`Step not found for given stepId <${stepId}>`);
    }

    return step.apiData || [];
  }

  /**
   * Returns if form field exists on a given step
   * @param stepId Id of the step to search the field in
   * @param fieldId Id of the field to find if exists
   * @returns boolean
   */
  formFieldExists(stepId: string, fieldId: string): boolean {
    const step = this.getStepById(stepId);

    if (!step) {
      return false;
    }
    return !!step.children.find((field) => field.id === fieldId);
  }

  /**
   *
   * @param stepId Id of the step to add a field
   * @param field field object to add to step children
   */
  addField(stepId: string, field: Field) {
    const step = this.getStepById(stepId);
    if (step) {
      step.children.push(field);
    }
  }

  /**
   * Returns if apiData field exists on a given step
   * @param stepId Id of the step to search the field in
   * @param fieldId Id of the field to find if exists
   * @returns boolean
   */
  apiDataFieldExists(stepId: string, fieldId: string): boolean {
    const step = this.getStepById(stepId);

    if (!step) {
      return false;
    }
    return !!step.apiData?.find((field) => field.id === fieldId);
  }

  /**
   *
   * @param stepId Id of the step to add a field
   * @param field field object to add to step apiData
   */
  addAPIData(stepId: string, field: JourneyValue) {
    const step = this.getStepById(stepId);
    if (step) {
      step?.apiData?.push(field);
    }
  }

  /**
   * Clears all api data for a given Step id
   * @param stepId Id of the step to clear apiData
   */
  clearApiData(stepId: string) {
    const step = this.getStepById(stepId);
    if (!step) {
      return;
    }
    step.apiData = step.apiData?.map((item: JourneyValue) => {
      if (Array.isArray(item.value)) {
        return { id: item.id, value: [] };
      }

      if (!isNaN(item.value)) {
        return { id: item.id, value: 0 };
      }

      if (typeof item.value === 'object' && item.value !== null) {
        return { id: item.id, value: {} };
      }

      return { id: item.id, value: '' };
    });
  }

  /**
   * Empty's activeStepsColletion data
   * TODO: function name shold be empty, and reset function should reset to original state, when first loaded
   */
  reset(): void {
    this.currentStep = new Step();
    this.currentStepIndex = 0;
    this.activeSteps = [];
    this.stepsConfig = [];
    this.history = new History();
  }

  /**
   * Sets current loaded step to be valid
   */
  setCurrentStepValid() {
    this.currentStep.valid = true;
  }

  /**
   * Finds and resets step to begining for given id
   * TODO: maybe implement reset on Step object an use here as stepToReset.reset()
   * @param id Step id to reset
   * @param stepConfig, Initial config of the step
   */
  resetStep(id: string, excludeFields?: Array<string>): Step {
    const stepConfig = this.stepsConfig.find((step) => step.id === id);
    const stepToReset = this.activeSteps.find((step) => step.id === id);
    if (!stepConfig || !stepToReset) {
      return new Step();
    }
    stepConfig.children = stepConfig.children.map((child) => {
      if (excludeFields?.includes(child.id)) {
        return stepToReset.children.find((stepToResetChild) => stepToResetChild.id === child.id) || child;
      }
      return child;
    });
    stepToReset.children = FormHelper.loadChildren(stepConfig.children);
    if (stepToReset?.apiData) {
      stepToReset.apiData = stepConfig?.apiData?.map((data) => {
        if (excludeFields?.includes(data.id)) {
          return { ...(stepToReset?.apiData?.find((stepToResetChild) => stepToResetChild.id === data.id) || data) };
        }
        return { ...data };
      });
    }
    return stepToReset;
  }

  /**
   * Sets all steps to valid = false after given stepId
   * @param stepId Step Id after witch all steps are invalidated
   */
  invalidateStepsAfter(stepId: string): void {
    const stepIndex = this.getStepIndexById(stepId);
    const arrayToInvalidate = this.activeSteps.slice(stepIndex + 1, this.activeSteps.length);
    arrayToInvalidate.forEach((step: Step) => {
      step.valid = false;
    });
  }

  /**
   * Loads and inserts steps from config by given ids, before the specified step
   * @param stepId Step id
   * @param stepsToInsertIds Ids of steps to insert into activeSteps
   */
  insertBefore(stepId: string, stepsToInsertIds: Array<string>): void {
    const stepIndex = this.getStepIndexById(stepId);
    this.insert(stepIndex, stepsToInsertIds);
    this.currentStepIndex += stepsToInsertIds.length;
  }

  /**
   * Loads and inserts steps from config by given ids, after the specified step
   * @param stepId Step id
   * @param stepsToInsertIds Ids of steps to insert into activeSteps
   */
  insertAfter(stepId: string, stepsToInsertIds: Array<string>): void {
    const stepIndex = this.getStepIndexById(stepId) + 1;
    this.insert(stepIndex, stepsToInsertIds);
  }

  /**
   * For given stepsIds Loads steps from config and inserts them in specified location
   * @param index where to place new steps in activeSteps collection
   * @param stepsToInsertIds Ids of steps to insert into activeSteps
   */
  insert(index: number, stepsToInsertIds: Array<string>): void {
    const stepsConfig = this.stepsConfig.filter((step) => stepsToInsertIds.includes(step.id));
    const newSteps = new ActiveStepsCollection(stepsConfig, null, {
      includePath: true,
    }).all();
    this.activeSteps.splice(index, 0, ...newSteps);
    this.validate(this.activeSteps);
  }

  /**
   * Removes steps from active steps collection
   * @param stepIds Array of step IDs
   */
  removeSteps(stepIds: Array<string>): void {
    this.activeSteps = this.activeSteps.filter((step) => !stepIds.includes(step.id));
  }

  /**
   * Returns users history of using Journey going forward and back
   */
  getHistory(): History {
    return this.history;
  }

  savePathToHistory(stepId: string, pathId: string, collectionId: string) {
    this.history.savePath(stepId, pathId, collectionId);
  }

  getChosenPathForStep(stepId: string) {
    const record = this.history.get().paths.find((item) => item.stepId === stepId);
    return record?.pathId;
  }

  removePathForStep(stepId: any) {
    this.history.removePath(stepId);
  }

  saveToModel(modelsConfig: ModelsConfig, value: any): void {
    if (modelsConfig.use) {
      value = get(value, modelsConfig.use);
    }
    modelsConfig.saveTo.forEach((key) => {
      set(this.models, key, value);
    });
  }

  removeModel(model: Array<string>): void {
    model.forEach((key) => {
      unset(this.models, key);
    });
  }

  getModels() {
    return cloneDeep(this.models);
  }

  addPath(pathId: string, steps: Array<StepInterface>, pathCollectionId = 'defaultPathGroup') {
    const path = JourneyHelper.createPath(pathId, steps);

    let pathCollection = this.pathGroups.find((_pathCollection) => _pathCollection.id === pathCollectionId);

    if (!pathCollection) {
      pathCollection = new PathCollection();
      pathCollection.id = pathCollectionId;
      this.pathGroups.push(pathCollection);
    }

    pathCollection.addPath(pathId);

    this.stepsConfig = [...this.stepsConfig, ...path];
  }

  getPathsGroups() {
    return this.pathGroups;
  }

  getPathCollection(pathId: string): PathCollection {
    const pathCollection = this.getPathsGroups().find((_pathCollection) => _pathCollection.hasPath(pathId));

    if (!pathCollection) {
      throw new JourneyError(`Cant find given path >>${pathId}<< in any path collection!`);
    }

    return pathCollection;
  }

  clearPathsInHistory(paths: string[]) {
    this.history.removePaths(paths);
  }

  /**
   * When user chooses one path,
   * returns to fork and then selects onther path,
   * and then goeas back with browser history, previous path want exist therefore applications should
   * always load fork step (where Journey branches into paths)
   */
  getPathFallback(slug: any) {
    const step = this.stepsConfig.find((stepConfig) => stepConfig.slug === slug);
    if (!step) {
      return;
    }

    const path = step.path;
    if (!path) {
      return;
    }

    const pathCollection = this.getPathsGroups().find((collection) => collection.getPaths().includes(path));
    const pathFork = this.history.get().paths.find((record) => record.collectionId === pathCollection?.id);

    if (!pathFork) {
      return;
    }
    return this.getStepById(pathFork?.stepId);
  }

  setPath(pathId: string) {
    const pathCollection = this.getPathCollection(pathId);

    const stepPath = this.getChosenPathForStep(this.getCurrentStep().id);

    // if trying to add the same pathId that has already been added, just exit the method
    if (stepPath === pathId) {
      return;
    }

    this.removePathAndPathSteps(pathCollection);

    const filteredSteps = this.stepsConfig.filter((stepConfig) => stepConfig.path === pathId);
    const stepsId = filteredSteps.map((step) => step.id);

    this.insertAfter(this.getCurrentStep().id, stepsId);
    this.savePathToHistory(this.getCurrentStep().id, pathId, pathCollection.id);
  }

  removePathAndPathSteps(pathCollection: PathCollection) {
    const paths = pathCollection.getPaths();

    const idsToDelete = this.stepsConfig
      .filter((step) => {
        if (!step.path) {
          return false;
        }
        return paths.includes(step.path);
      })
      .map((step) => step.id);

    this.removeSteps(idsToDelete);
    this.clearPathsInHistory(paths);
  }

  isStepInPath(slug: string) {
    return this.stepsConfig.find((config) => config.hasOwnProperty('path') && config.slug === slug);
  }

  validate(steps: Array<Step>) {
    DataHelper.validateFields(steps);
  }
}
