import { JourneyError } from './../exceptions/journey.exception';
import { Inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of, EMPTY, Subject } from 'rxjs';
import { ActivatedRoute, NavigationEnd, NavigationExtras, Router } from '@angular/router';
import { SessionService } from './session.service';
import { Session } from '../models/session';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';
import { JourneyConfig } from '../models/journey.config';
import { ControlService, Field, ModelsConfig, FormValue } from '@crosig/easy-forms';
import { Step } from '../models/step';
import { JourneyValue } from '../models/journey-value';
import { Hook } from '../interfaces/hook';
import { HooksEnum } from '../enum/hooks-enum';
import { ActiveStepsCollection } from '../models/active-steps.collection';
import { SaveStepOptions } from '../models/save-step';
import { ABTestsHelper } from '../models/ab-tests';
import { GlobalConfig } from '../models/global.config';
import { FOR_ROOT_CONFIG_TOKEN } from '../journey.config';
import { DateHelper } from '../helpers/date.helper';
import { DurationModel } from '../models/duration-model';
import { SessionHelper } from '../helpers/session.helper';
import { PathConfig } from '../interfaces/paths.config';
import { LocationStrategy } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class JourneyService {
  private config!: JourneyConfig;

  private activeSteps!: ActiveStepsCollection;
  private resetJourneyTimeout: any;

  private journeyLoaded = false;

  private currentStepChanged = new BehaviorSubject<any>(null);
  private currentStepChanged$ = this.currentStepChanged.asObservable();

  private stepChangePrevented = new Subject<Step | null>();
  private stepChangePrevented$ = this.stepChangePrevented.asObservable();

  private activeStepsChanged = new BehaviorSubject<Array<any>>([]);
  private activeStepsChanged$ = this.activeStepsChanged.asObservable();
  private controlSubscription!: Subscription;
  private validStatusChangesSubscription!: Subscription;
  private routeParamsSubscription!: Subscription;

  hooks: Array<Hook> = [];

  constructor(
    @Inject(FOR_ROOT_CONFIG_TOKEN) private globalConfig: GlobalConfig,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private sessionService: SessionService,
    private controlService: ControlService,
    private ngZone: NgZone,
    private locationStrategy: LocationStrategy
  ) {}

  subscribeToEasyFormsControlsChanges() {
    this.controlSubscription = this.controlService
      .fieldsValueChanges()
      .pipe(
        switchMap((value) => {
          const existingStepFields = this.getExistingStepFields(value);
          if (Object.keys(existingStepFields).length > 0) {
            return of(existingStepFields);
          }
          return EMPTY;
        })
      )
      .pipe(
        tap((value) => {
          this.saveCurrentStep(value, false, { saveSession: false });
          this.handleStepLink(value);
        })
      )
      .pipe(distinctUntilChanged(), debounceTime(500))
      .subscribe();
  }

  subscribeToValidStatusChanges() {
    this.validStatusChangesSubscription = this.controlService
      .validStatusChanges()
      .pipe(distinctUntilChanged(), debounceTime(500))
      .subscribe((value) => {
        this.saveSession();
      });
  }

  private getExistingStepFields(values: FormValue): FormValue {
    const existingStepFields: any = {};
    Object.entries(values).forEach(([key, value]) => {
      if (this.activeSteps?.getCurrentStep()?.getChildById(key)) {
        existingStepFields[key] = value;
      }
    });
    return existingStepFields;
  }

  handleStepLink(currentValues: FormValue): void {
    Object.keys(currentValues).forEach((key) => {
      const field = this.activeSteps.getCurrentStep()?.getChildById(key);
      if (field?.isStepLink() && field?.valueIsSet()) {
        this.next();
      }
    });
  }

  /**
   * Initializes the Journey. Happens only when the App/route is loaded first time or with browser refresh.
   * Helps setup corresponding step for a given route.
   * Uses canLoadStepOnInit() to check if User has acces to the step
   * Loads journey config from session if valid
   * @param config Journey config
   */

  init(config: JourneyConfig): Observable<null | Session> {
    this.config = { ...config };

    this.subscribeToEasyFormsControlsChanges();
    this.subscribeToValidStatusChanges();

    if (this.config.abTest) {
      const abTests = new ABTestsHelper(this.config.abTest, this.config.steps);
      this.config.steps = abTests.getSteps();
    }

    const stepToLoad = this.getStepToLoad(this.config.slug);

    if (!stepToLoad) {
      this.router.navigateByUrl(this.config.routeFallback!);
      return of(null);
    }

    return this.sessionService
      .onInit({
        journeyId: config.id,
        canLoadFromSession: stepToLoad.canLoadFromSession,
        sessionConfig: this.config.sessionConfig,
      })
      .pipe(
        tap((session: Session | null) => {
          this.activeSteps = new ActiveStepsCollection(this.config.steps, session, {
            includePath: false,
            paths: this.config.pathsConfig,
          });
          this.activeStepsChanged.next(this.activeSteps.all());
          this.loadStepOnInit(this.config.slug);
          this.journeyLoaded = true;
          this.listenToStepChanges();
        })
      );
  }

  listenToStepChanges() {
    this.routeParamsSubscription = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route: any) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .subscribe((route) => {
        this.loadStepOnAngularRouter(route.snapshot.params['slug']);
      });
  }

  sessionTimeRestriction() {
    clearTimeout(this.resetJourneyTimeout);
    if (!this.config.sessionConfig) {
      return;
    }
    const currentDate = new Date();
    const appendedDate = DateHelper.add(new Date(), this.config.sessionConfig.resetPeriod);
    const resetPeriod = DateHelper.differenceInMilliseconds(appendedDate, currentDate);
    this.ngZone.runOutsideAngular(() => {
      this.resetJourneyTimeout = setTimeout((param: any) => {
        this.ngZone.run(() => {
          this.goToStart(true);
        });
      }, resetPeriod);
    });
  }

  /**
   *
   * @param hook Hook
   * Hooks are used for editing session
   */
  addHook(hook: Hook) {
    this.hooks.push(hook);
  }

  /**
   * Navigates to next step in Journey with Angular router
   */
  next(options?: any): void {
    if (!this.activeSteps.getCurrentStep().goToNextEnabled) {
      this.preventChange();
      return;
    }

    if (options?.path) {
      // Needs to be called before this.activeSteps.getNext()
      this.handlePath(options.path);
    }

    const nextStep = this.activeSteps.getNext();

    if (!nextStep) {
      return;
    }

    this.setCurrentStepValid();
    this.saveSession();

    if (nextStep.changesUrl) {
      this.router.navigate([`${this.config.route}/${nextStep.slug}`]);
      return;
    }

    this.loadStep(nextStep);
  }

  private handlePath(pathId: string) {
    if (pathId === 'none') {
      this.removePathForCurrentStep();
      return;
    }

    this.setPath(pathId);
  }

  private removePathForCurrentStep() {
    const currentStep = this.getCurrentStepId();
    if (!currentStep) {
      return;
    }
    const pathId = this.activeSteps.getChosenPathForStep(currentStep);
    if (!pathId) {
      return;
    }
    const pathCollection = this.activeSteps.getPathCollection(pathId);
    this.activeSteps.removePathAndPathSteps(pathCollection);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  private setPath(pathId: string): void {
    this.activeSteps.setPath(pathId);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  setCurrentStepValid() {
    this.activeSteps.setCurrentStepValid();
  }

  /**
   * Navigates to previous step in Journey with Angular router
   */
  previous(stepToLoad?: Step): void {
    const previousStep = stepToLoad || this.activeSteps.getPrevious();
    if (!this.activeSteps.getCurrentStep().returnToPreviousEnabled) {
      this.preventChange();
      return;
    }
    if (!previousStep) {
      return;
    }

    if (!this.activeSteps.getCurrentStep().changesUrl) {
      this.loadStep(previousStep);
      return;
    }

    const previousWithUrl = stepToLoad || this.previousWithUrl();

    this.router.navigate([`${this.config.route}/${previousWithUrl?.slug}`]);
  }

  previousWithUrl() {
    return this.activeSteps.getPreviousWithUrl();
  }

  /**
   * Returns observable when the active step has changed
   */
  getCurrentStep(): Observable<Step> {
    return this.currentStepChanged$.pipe(filter((value) => value !== null));
  }

  /**
   * Returns observable when any data of available steps has changed
   */
  getActiveSteps(): Observable<Array<Step>> {
    return this.activeStepsChanged$;
  }

  /**
   * Creates session for user if step supports loading from session
   * and user does not have session aleready
   * @param step step for witch session is checked
   */
  handleSession(step: any) {
    if (this.sessionService.hasValidSession()) {
      return;
    }

    this.sessionService.removeSession();

    if (step.canLoadFromSession) {
      let session = SessionHelper.prepareForBackend(this.activeSteps, this.config);
      session = this.applySessionHooks(session);
      this.sessionService.createSession(session);
    }
  }

  /**
   * Function that finds step by slug and sets it as a current step on init if it can be loaded.
   * Init of the Journey happens when user comes directly to Journey page from address bar or refreshes page.
   * uses canLoadStepOnInit() to check if user can come directly to some step
   * @param slug Parameter to find and load step
   */
  loadStepOnInit(slug: string) {
    let stepToLoad = this.activeSteps.getStepBySlug(slug);

    if (this.canLoadStepOnInit(slug)) {
      if (stepToLoad === undefined && this.isStepInPath(slug)) {
        stepToLoad = this.ensurePathFallback(slug);
        this.router.navigateByUrl(`/${this.config.route}/${stepToLoad?.slug}`);
        return;
      }

      if (!stepToLoad) {
        this.router.navigateByUrl(`/stranica-ne-postoji`);
        return;
      }

      if (!this.activeSteps.stepsBeforeAreValid(stepToLoad)) {
        this.navigateToFirstInvalidStep();
        return;
      }

      this.loadStepBySlug(slug, true);
      return;
    }

    if (stepToLoad && stepToLoad.protectLoadFromSession === 'nonce') {
      this.goToStart(true);
      return;
    }

    // TODO: goToStart should receive options, this is unreadable
    this.goToStart(false, true);
  }

  navigateToFirstInvalidStep() {
    const invalidStep = this.activeSteps.getFirstInvalidStep();
    if (invalidStep && invalidStep.slug) {
      const slugToLoad = this.getInvalidStepSlug(invalidStep);
      this.router.navigateByUrl(`/${this.config.route}/${slugToLoad}`);
    }
  }

  getInvalidStepSlug(invalidStep: Step): string | undefined {
    if (invalidStep.changesUrl) {
      return invalidStep.slug;
    }

    return this.activeSteps.getPreviousWithUrl(invalidStep.slug)?.slug;
  }

  /**
   * Check if user can load some step on init.
   * For development purposes guard can be turned of
   * @param slug Slug Journey is currently trying to load
   */
  canLoadStepOnInit(slug: string): boolean {
    if (!this.config.guardRoutes) {
      return true;
    }

    const stepToLoad = this.getStepToLoad(slug);

    if (!stepToLoad) {
      return false;
    }

    if (stepToLoad?.canLoadFromSession) {
      return this.checkSession(stepToLoad);
    }

    if (this.activeSteps.isFirst(stepToLoad)) {
      return true;
    }

    return false;
  }

  checkSession(stepToLoad: any): boolean {
    if (!this.sessionService.hasValidSession()) {
      return false;
    }

    if (stepToLoad.protectLoadFromSession === 'nonce') {
      const queryParams = this.router.routerState.snapshot.root.queryParams;
      return queryParams.hasOwnProperty('nonce') && this.sessionService.isNonceValid(queryParams['nonce']);
    }

    if (this.isStepInPath(stepToLoad.slug)) {
      const selectedPaths = this.activeSteps.getHistory().getPaths();
      const isInSelectedPaths = selectedPaths.find((pathRecord) => pathRecord.path === stepToLoad.path);
      return !!isInSelectedPaths;
    }

    return true;
  }

  /**
   * Loads step only on angular router.
   * Does not trigger if Journey is not loaded. for example Journey is stil loading first time on init
   * Be
   * @param slug Url slug
   */
  loadStepOnAngularRouter(slug: string) {
    let stepToLoad = this.activeSteps.getStepBySlug(slug);

    if (!stepToLoad) {
      if (this.isStepInPath(slug)) {
        stepToLoad = this.ensurePathFallback(slug);
        if (stepToLoad?.slug) {
          this.router.navigateByUrl(`/${this.config.route}/${stepToLoad.slug}`);
        }
      }

      return;
    }

    const isFirstStep = this.activeSteps.isFirst(stepToLoad);
    const stepsBeforeAreValid = this.activeSteps.stepsBeforeAreValid(stepToLoad);

    if (isFirstStep || stepsBeforeAreValid) {
      this.loadStepBySlug(stepToLoad?.slug);
      return;
    }

    const firstInvalidStep = this.activeSteps.getFirstInvalidStep();
    if (!firstInvalidStep) {
      this.goToStart();
      return;
    }

    let validSlug: string | undefined = firstInvalidStep.slug;
    if (!firstInvalidStep.changesUrl && firstInvalidStep.parentId) {
      validSlug = this.activeSteps.getStepById(firstInvalidStep.parentId)?.slug;
    }

    this.router.navigateByUrl(`/${this.config.route}/${validSlug}`);
    return;
  }

  private ensurePathFallback(slug: any) {
    return this.activeSteps.getPathFallback(slug);
  }

  private isStepInPath(slug: string) {
    return this.activeSteps.isStepInPath(slug);
  }

  loadStep(step: Step) {
    step.browserNavigate = false;
    this.activeSteps.setCurrentStep(step);
    this.currentStepChanged.next(step);
    return true;
  }

  /**
   * Function that finds step by slug and sets it as a current step
   * @param slug Property to find step by
   */
  loadStepBySlug(slug: string, browserNavigate = false): boolean {
    const currentStep = this.activeSteps.getStepBySlug(slug);
    if (!currentStep) {
      return false;
    }
    currentStep.browserNavigate = browserNavigate;
    this.activeSteps.setCurrentStep(currentStep);
    this.handleSession(currentStep);
    this.currentStepChanged.next(currentStep);
    return true;
  }

  /**
   * Wrapper function, uses SaveStep() to save current step
   * @param values Key value pair to save step data to current step
   * @param notifyChange if information change should be notified to others (*note - could couse Circular step update)
   */
  saveCurrentStep(values: FormValue, notifyChange = false, saveOptions?: any) {
    const options = new SaveStepOptions().loadModel(saveOptions);

    const currentStep = this.activeSteps.getCurrentStep();
    if (!currentStep) {
      return;
    }
    this.saveStep(currentStep.id, values, notifyChange, options.valid);

    if (options.saveSession) {
      this.saveSession();
    }
  }

  /**
   * Function that saves form data to step in a journey with provided id
   * @param id current step id
   * @param values Key value pair to save step data to current step
   * @param notifyChange if information change should be notified to others (*note - could couse Circular step update)
   * @param valid is the step valid (Form is valid and API data is valid)
   */
  saveStep(id: string, values: FormValue, notifyChange = false, valid?: boolean): void {
    const step = this.activeSteps.saveStep(id, values, valid);

    if (notifyChange) {
      this.currentStepChanged.next(step);
      this.activeStepsChanged.next(this.activeSteps.all());
    }
  }

  /**
   * Saves API data to step with provided stepId
   * @param stepId stepId to save API data to
   * @param fields key value pair of data to save
   */
  saveApiData(stepId: string, fields: object, resetMissing = false): void {
    this.activeSteps.saveApiData(stepId, fields, resetMissing);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  saveFields(stepId: string, fields: object, resetMissing = false) {
    this.activeSteps.saveFields(stepId, fields, resetMissing);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  setFieldVisibility(stepId: string, fieldId: string, visible: boolean) {
    this.activeSteps.setFieldVisibility(stepId, fieldId, visible);
  }

  /**
   * Looks for value in apiData or field.value of all steps
   * @param fieldId Id of the field/apiData or path to the field/apiData (ex. subform.subform.someField.object.value) or you can go directly to someField.object.value
   * @Note: it cannot return whole subform object, only field.value
   */
  getValueById(fieldId: string) {
    return this.activeSteps.getValueById(fieldId);
  }

  /**
   * Tries to save lead
   */
  saveSession(): void {
    if (!this.sessionService.hasValidSession() || !this.sessionService.isSessionActive()) {
      return;
    }

    let session = SessionHelper.prepareForBackend(this.activeSteps, this.config);
    session = this.applySessionHooks(session);
    this.sessionService.updateSession(session);
  }

  /**
   * Saves lead
   * @returns Observable<Session>
   */
  ensureSaveSession(): Observable<Session> | undefined {
    if (!this.sessionService.hasValidSession() || !this.sessionService.isSessionActive()) {
      return;
    }

    let session = SessionHelper.prepareForBackend(this.activeSteps, this.config);
    session = this.applySessionHooks(session);
    return this.sessionService.ensureUpdateSession(session);
  }

  /**
   * Takes session object and applies hooks on it
   * @param session Session on witch hooks should be applied
   * @returns changed Session object
   */
  applySessionHooks(session: Session): Session {
    const sessionBeforeSaveHooks = this.hooks.filter((value) => {
      return value.id === HooksEnum.SessionBeforeSaveHook;
    });

    sessionBeforeSaveHooks.forEach((hook: Hook) => {
      session = hook.apply(session);
    });

    return session;
  }

  /**
   * Extracts values from steps for given class and populates values
   * @param className Class constructor
   * @param includeEmpty Weather to include properties that have no value
   */
  getValuesByModel<T>(className: any, includeEmpty = false, mapper: any = null): T {
    return this.activeSteps.getValuesByModel(className, includeEmpty, mapper);
  }

  /**
   * Retreives first step in the Journey
   * @returns Step
   */
  getFirstStep(): Step {
    return this.activeSteps.getFirst();
  }

  /**
   *
   * @param stepId Id of the step to add a field
   * @param field field object to add to step children
   */
  addField(stepId: string, field: Field) {
    this.activeSteps.addField(stepId, field);
  }

  /**
   *
   * @param stepId Id of the step to add a field
   * @param field field object to add to step apiData
   */
  addAPIData(stepId: string, field: JourneyValue) {
    this.activeSteps.addAPIData(stepId, field);
  }

  /**
   * Returns if apiData field exists on a given step
   * @param stepId Id of the step to search the field in
   * @param fieldId Id of the field to find if exists
   * @returns boolean
   */
  apiDataFieldExists(stepId: string, fieldId: string): boolean {
    return this.activeSteps.apiDataFieldExists(stepId, fieldId);
  }

  /**
   * Returns if form field exists on a given step
   * @param stepId Id of the step to search the field in
   * @param fieldId Id of the field to find if exists
   * @returns boolean
   */
  formFieldExists(stepId: string, fieldId: string): boolean {
    return this.activeSteps.formFieldExists(stepId, fieldId);
  }

  getApiData(stepId: string): Array<JourneyValue> {
    return this.activeSteps.getApiData(stepId);
  }

  clearApiData(stepId: string): void {
    this.activeSteps.clearApiData(stepId);
  }

  reset(): void {
    this.activeSteps?.reset();
    this.config = new JourneyConfig();
    this.journeyLoaded = false;
    this.hooks = [];
    this.currentStepChanged?.next(null);
  }

  destroy() {
    this.reset();
    this.controlSubscription?.unsubscribe();
    this.routeParamsSubscription?.unsubscribe();
    this.validStatusChangesSubscription?.unsubscribe();
  }

  getStepById(id: string): Step {
    const step = this.activeSteps.getStepById(id);
    if (!step) {
      throw new JourneyError(`Unknown step id provided: ${id}!`);
    }
    return step;
  }

  onSubStepChange() {
    window.scrollTo(0, 0);
  }

  resetStep(id: string, excludeFields?: Array<string>) {
    this.activeSteps.resetStep(id, excludeFields);
  }

  /**
   * Creates nonce used for redirectUrl to given step
   * @param stepId stepId to createNone
   * @param expires time URL noce is valid for
   */
  createComeBackUrlNonce(stepId: string, expires?: DurationModel): string {
    const nonce = this.sessionService.createNonce(stepId, expires);
    return nonce.id;
  }

  getConfigRoute() {
    if (this.config) {
      return this.config.route;
    }
    return '';
  }

  getCurrentStepId() {
    return this.activeSteps.getCurrentStep().id;
  }

  invalidateStepsAfter(stepId: string): void {
    this.activeSteps.invalidateStepsAfter(stepId);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  getConfigRouteForUrl(route: string) {
    if (!route || route === '' || route === '/') {
      return '/';
    }
    return `/${route}/`;
  }

  getAbsoluteStartUrl(
    locationStrategy: LocationStrategy,
    route: string,
    firstStepSlug: string,
    angularNavigation = false
  ) {
    if (angularNavigation) {
      return `${this.getConfigRouteForUrl(route)}${firstStepSlug}`;
    }
    return `${this.getBaseHref(locationStrategy)}${this.getConfigRouteForUrl(route)}${firstStepSlug}`;
  }

  goToStart(clearHistory = false, preserveQueryParams = false) {
    if (clearHistory) {
      window.location.replace(
        this.getAbsoluteStartUrl(this.locationStrategy, this.config.route, this.getFirstStep().slug)
      );
    }

    let navigateOptions: NavigationExtras = { relativeTo: this.activatedRoute };

    if (preserveQueryParams) {
      navigateOptions = { ...navigateOptions, queryParamsHandling: 'preserve' };
    }

    this.router.navigate(
      [this.getAbsoluteStartUrl(this.locationStrategy, this.config.route, this.getFirstStep().slug, true)],
      navigateOptions
    );
  }

  getBaseHref(locationStrategy: LocationStrategy) {
    let baseHref = locationStrategy.getBaseHref();
    if (baseHref.endsWith('/')) {
      baseHref = baseHref.substring(0, baseHref.length - 1);
    }
    return baseHref;
  }

  getPathFromConfig(config: Array<any>, path: string) {
    return config.filter((stepConfig) => stepConfig.path === path);
  }

  getModels() {
    return this.activeSteps.getModels();
  }

  getHistory() {
    return this.activeSteps.getHistory();
  }

  getStepPath() {
    return this.config;
  }

  /**
   * Saves provided values by key to journey models
   * @param modelsConfig configuration
   * @param value value to be saved to model
   */
  saveToModel(modelsConfig: ModelsConfig, value: any) {
    this.activeSteps.saveToModel(modelsConfig, value);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  removeModel(model: Array<string>) {
    this.activeSteps.removeModel(model);
    this.activeStepsChanged.next(this.activeSteps.all());
  }

  isJourneyLoaded() {
    return this.journeyLoaded;
  }

  getStepToLoad(slug: string): Step | undefined {
    let stepToLoad = this.config.steps.find((step) => {
      return step.slug === slug;
    });

    if (stepToLoad) {
      return stepToLoad;
    }

    const pathsConfig = this.config.pathsConfig;
    let stepsInPaths: any[] = [];

    if (!pathsConfig) {
      return;
    }
    if (pathsConfig.length > 0) {
      pathsConfig.forEach((pathsGroup: PathConfig) => {
        pathsGroup.paths.forEach((path) => {
          stepsInPaths = [...stepsInPaths, ...path.steps];
        });
      });
    }

    stepToLoad = stepsInPaths.find((step) => {
      return step.slug === slug;
    });

    if (stepToLoad) {
      return stepToLoad;
    }

    return undefined;
  }

  private onTabFocus() {
    if (this.sessionService.hasSessionIdMismatch()) {
      this.goToStart(true);
      location.reload();
    }
  }

  updateJourneyName(journeyName: string) {
    this.config.journey = journeyName;
  }

  preventChange(step?: Step | undefined) {
    if (!step) {
      this.stepChangePrevented.next(null);
      return;
    }
    this.stepChangePrevented.next(step);
  }

  onStepPrevented() {
    return this.stepChangePrevented$;
  }
}
