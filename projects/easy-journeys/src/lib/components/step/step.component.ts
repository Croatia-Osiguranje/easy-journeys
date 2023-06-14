import { Component, Input } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Step } from '../../models/step';
import { JourneyService } from '../../services/journey.service';

@Component({
  selector: 'easy-step',
  templateUrl: './step.component.html',
  styleUrls: ['./step.component.scss'],
})
export class StepComponent {
  @Input() step!: Step;
  @Input() form!: UntypedFormGroup;
  constructor(public journeyService: JourneyService) {}
}
