import { PathConfig } from '../interfaces/paths.config';
import { SessionConfig } from './session.config';

export class JourneyConfig {
  /**
   * Used for storing sessions and localstorage
   */
  id!: string;

  /**
   * Main route of the journey, used when constructing redirects to substeps with router
   */
  route!: string;

  /**
   * Naviate to routeFallback when it cannot navigate to step route
   */
  routeFallback? = '/stranica-ne-postoji';

  /**
   * Determines what step to load from URL on app initialization
   * whe user refreshes page or commes directly to some URL
   */
  slug!: string;

  /**
   * Journey steps config. Its used once on init to construct Journey
   */
  steps!: Array<any>;

  /**
   * If #guardRoutes is true Journey runner checks if user can access a specific step
   * guard can be turned off for development purposes
   */
  guardRoutes = true;

  /**
   * holds abTest initial configuration
   */
  abTest?: any;

  /**
   * paths configuration
   */
  pathsConfig?: Array<PathConfig> = [];

  /**
   * Session configuration
   */
  sessionConfig!: SessionConfig;

  application!: string;

  journey!: string;

  constructor(config?: JourneyConfig) {
    Object.assign(this, config);
  }
}
