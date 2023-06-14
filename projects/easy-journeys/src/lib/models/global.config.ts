export interface GlobalConfig {
  debug: boolean;
  environment?: string;
  localStorage: {
    nameSpace: string;
  };
  loggerService?: any;
}
