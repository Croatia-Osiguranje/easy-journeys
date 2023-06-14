import { Component, Input } from '@angular/core';

@Component({
  selector: 'easy-page-description',
  templateUrl: './page-description.component.html',
  styleUrls: ['./page-description.component.scss'],
})
export class PageDescriptionComponent {
  @Input() description!: string;
  @Input() cssClass!: string;
}
