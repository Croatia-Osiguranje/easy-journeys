import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'easy-navigation-buttons',
  templateUrl: './navigation-buttons.component.html',
  styleUrls: ['./navigation-buttons.component.scss'],
})
export class NavigationButtonsComponent {
  constructor() {}
  @Input() prevVisible = true;
  @Input() nextVisible = true;
  @Input() prevDisabled = false;
  @Input() nextDisabled = false;
  @Input() nextButtonText = 'Nastavi';
  @Input() form!: AbstractControl;
  @Output() clickNext: EventEmitter<any> = new EventEmitter();
  @Output() clickPrev: EventEmitter<any> = new EventEmitter();
}
