import { Component, Input } from '@angular/core';

@Component({
  selector: 'easy-page-title',
  templateUrl: './page-title.component.html',
  styleUrls: ['./page-title.component.scss'],
})
export class PageTitleComponent {
  @Input() title!: string;
  @Input() description!: string;
  @Input() cssClass!: string;
}
