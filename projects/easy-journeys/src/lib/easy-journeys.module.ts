import { ModuleWithProviders, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { EasyFormsModule } from '@crosig/easy-forms';
import { DebugComponent } from './components/debug/debug.component';
import { StepTitleComponent } from './components/ui/step-title/step-title.component';
import { PreventDoubleClickDirective } from './directives/prevent-doubleclick.directive';
import { PageTitleComponent } from './components/ui/page-title/page-title.component';
import { StepComponent } from './components/step/step.component';
import { CustomStepComponent } from './components/custom-step/custom-step.component';
import { NavigationButtonsComponent } from './components/ui/navigation-buttons/navigation-buttons.component';
import { BuilderComponent } from './components/step-builder/builder.component';
import { GlobalConfig } from './models/global.config';
import { FOR_ROOT_CONFIG_TOKEN } from './journey.config';
import { PageDescriptionComponent } from './components/ui/page-description/page-description.component';
import { PreventDoubleSubmitDirective } from './directives/prevent-doublesubmit.directive';
import { JourneyService } from './services/journey.service';
import { SessionService } from './services/session.service';

@NgModule({
  declarations: [
    BuilderComponent,
    DebugComponent,
    NavigationButtonsComponent,
    StepTitleComponent,
    PageTitleComponent,
    PreventDoubleClickDirective,
    PreventDoubleSubmitDirective,
    StepComponent,
    CustomStepComponent,
    PageDescriptionComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule, EasyFormsModule],
  exports: [
    BuilderComponent,
    DebugComponent,
    NavigationButtonsComponent,
    ReactiveFormsModule,
    FormsModule,
    EasyFormsModule,
    StepTitleComponent,
    PageTitleComponent,
    PreventDoubleClickDirective,
    PreventDoubleSubmitDirective,
    CustomStepComponent,
    StepComponent,
    PageDescriptionComponent,
  ],
})
export class EasyJourneysModule {
  static forRoot(config: GlobalConfig): ModuleWithProviders<EasyFormsModule> {
    return {
      ngModule: EasyJourneysModule,
      providers: [
        {
          provide: FOR_ROOT_CONFIG_TOKEN,
          useValue: config,
        },
      ],
    };
  }

  static forChild(config: GlobalConfig): ModuleWithProviders<EasyFormsModule> {
    return {
      ngModule: EasyJourneysModule,
      providers: [
        {
          provide: FOR_ROOT_CONFIG_TOKEN,
          useValue: config,
        },
        JourneyService,
        SessionService,
      ],
    };
  }
}
