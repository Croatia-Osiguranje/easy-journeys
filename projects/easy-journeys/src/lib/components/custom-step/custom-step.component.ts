import { Component, ComponentFactoryResolver, Input, ViewChild, ViewContainerRef } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { FormHelper } from '@crosig/easy-forms';
import { Step } from '../../models/step';

@Component({
  selector: 'easy-custom-step',
  templateUrl: './custom-step.component.html',
  styleUrls: ['./custom-step.component.scss'],
})
export class CustomStepComponent {
  constructor(private resolver: ComponentFactoryResolver, private fb: UntypedFormBuilder) {}
  @ViewChild('dynamicComponentContainer', {
    read: ViewContainerRef,
    static: true,
  })
  dynamicComponentContainer!: ViewContainerRef;

  private _step!: Step;
  @Input()
  set step(value) {
    if (!value) {
      return;
    }
    this._step = value;
    this.dynamicComponentContainer.clear();
    const componentFactory = this.resolver.resolveComponentFactory(value.component.instance);
    const componentRef: any = this.dynamicComponentContainer.createComponent(componentFactory);
    componentRef.instance.stepData = value;
    if (value.component.generateForms) {
      this.generateForms(value.children, componentRef);
    }
    value?.component?.inputs?.forEach((input) => {
      componentRef.instance[input.provide] = input.useValue;
    });
  }

  get step() {
    return this._step;
  }

  generateForms(fields: any, componentRef: any) {
    if (fields.length) {
      componentRef.instance.form = this.fb.group(FormHelper.createControls(fields));
    }
  }
}
