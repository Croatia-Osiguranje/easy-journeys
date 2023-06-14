import { Component, OnInit, OnDestroy } from '@angular/core';
import { JourneyService } from '../../services/journey.service';
import { Subscription } from 'rxjs';
import { SessionService } from '../../services/session.service';
import { ControlService, Field } from '@crosig/easy-forms';

@Component({
  selector: 'easy-debug',
  templateUrl: './debug.component.html',
  styleUrls: ['./debug.component.scss'],
})
export class DebugComponent implements OnInit, OnDestroy {
  isDebuggerVisible = true;
  activeSteps!: Array<any>;

  fieldsOpen = true;
  sessionOpen = true;
  modelsOpen = true;

  activeStepsSub!: Subscription;
  currentStepSub!: Subscription;
  controlChangesSub!: Subscription;

  sessionExpires!: string;
  hasSession!: boolean;
  sessionValid!: boolean;
  expires!: string | null;

  showObjectFields: any[] = [];

  fieldTypesExcludedFromDebugger = ['formTitle', 'errorField', 'richText', 'fieldGroup', 'infoField'];

  models: Array<any> = [];

  constructor(
    private journeyService: JourneyService,
    private sessionService: SessionService,
    private controlService: ControlService
  ) {}

  ngOnInit(): void {
    this.initDebuggerVisibility();
    this.activeStepsSub = this.journeyService.getActiveSteps().subscribe((activeSteps) => {
      this.activeSteps = activeSteps;
      this.getModels();
    });

    this.hasSession = this.sessionService.hasSession();
    this.sessionValid = this.sessionService.hasValidSession();
    this.expires = this.sessionService.getExpiry();

    this.currentStepSub = this.journeyService.getCurrentStep().subscribe((currentStep) => {
      this.hasSession = this.sessionService.hasSession();
      this.sessionValid = this.sessionService.hasValidSession();
      this.expires = this.sessionService.getExpiry();
    });

    this.controlChangesSub = this.controlService.fieldsValueChanges().subscribe(() => {
      this.getModels();
    });
  }

  getModels() {
    const models = this.journeyService.getModels();
    this.models = Object.keys(models).map((key) => {
      return {
        key: key,
        value: models[key],
      };
    });
  }

  toggleSection(property: string) {
    let lookupProperty = this[property as keyof DebugComponent] as boolean;
    lookupProperty = !lookupProperty;
  }

  setResponseClasses(response?: any) {
    const classes = {
      'debug-result': true,
      'is-true': true === response,
      'is-false': false === response,
    };

    return classes;
  }

  ngOnDestroy(): void {
    this.activeStepsSub?.unsubscribe();
    this.currentStepSub?.unsubscribe();
    this.controlChangesSub?.unsubscribe();
  }

  isObject(fieldValue: any) {
    return typeof fieldValue === 'object';
  }

  isSubform(field: Field): boolean {
    return field.type === 'subForm';
  }

  isFieldGroup(field: Field): boolean {
    return field.type === 'fieldGroup';
  }

  showHideObjectFields(field: any) {
    if (!this.isObject(field.value) && !field.children) {
      return;
    }
    const id = field.id ? field.id : field.key;
    const index: number = this.showObjectFields.indexOf(id);
    if (index !== -1) {
      this.showObjectFields.splice(index, 1);
      return;
    }
    this.showObjectFields.push(id);
  }

  isObjectFieldsVisible(fieldId: any) {
    return this.showObjectFields.includes(fieldId);
  }

  toggleDebuggerVisibility() {
    const debuggerVisible = window.localStorage.getItem('debuggerVisible');

    if (debuggerVisible) {
      this.isDebuggerVisible = false;
      window.localStorage.removeItem('debuggerVisible');

      return;
    }

    this.isDebuggerVisible = true;
    window.localStorage.setItem('debuggerVisible', '1');
  }

  initDebuggerVisibility() {
    this.isDebuggerVisible = !!window.localStorage.getItem('debuggerVisible');
  }
}
