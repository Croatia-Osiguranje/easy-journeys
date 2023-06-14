import { Directive, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Directive({
  selector: '[easyPreventDoubleSubmit]',
})
export class PreventDoubleSubmitDirective implements OnInit, OnDestroy {
  @Input()
  throttleTime = 500;

  @Output()
  preventDoubleSubmit = new EventEmitter();

  private clicks = new Subject();
  private subscription!: Subscription;

  constructor() {}

  ngOnInit() {
    this.subscription = this.clicks
      .pipe(throttleTime(this.throttleTime))
      .subscribe((e) => this.preventDoubleSubmit.emit(e));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  @HostListener('clickSubmit', ['$event'])
  clickEvent(event: any) {
    this.clicks.next(event);
  }
}
