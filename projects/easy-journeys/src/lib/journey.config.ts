import { InjectionToken } from '@angular/core';
import { GlobalConfig } from './models/global.config';

export const FOR_ROOT_CONFIG_TOKEN = new InjectionToken<GlobalConfig>(
  'forRoot() Journey Builder Global Configuration.'
);
