import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { Step } from '../../../models/step';

@Component({
  selector: 'easy-step-title',
  templateUrl: './step-title.component.html',
  styleUrls: ['./step-title.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepTitleComponent {
  @Input() stepData!: Step;
  @Input() description!: string;
}
