import { Component, Inject, Input } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { FormHelper } from '@crosig/easy-forms';
import { FOR_ROOT_CONFIG_TOKEN } from '../../journey.config';
import { GlobalConfig } from '../../models/global.config';
import { Step } from '../../models/step';

@Component({
  selector: 'easy-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss'],
})
export class BuilderComponent {
  form!: UntypedFormGroup;
  public debug;

  private _step!: Step;

  @Input()
  set step(value) {
    this.form = this.fb.group(FormHelper.createControls(value.children));
    this._step = value;
  }

  get step() {
    return this._step;
  }

  constructor(private fb: UntypedFormBuilder, @Inject(FOR_ROOT_CONFIG_TOKEN) globalConfig: GlobalConfig) {
    this.debug = globalConfig.debug;
  }
}
