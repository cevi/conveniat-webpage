export enum DesignCodes {
  APP_DESIGN = 'design-mode-app',
  WEB_DESIGN = 'design-mode-web',
}

export const DesignModeTriggers = {
  QUERY_PARAM_FORCE: 'force-app-mode',
  QUERY_PARAM_IMPLICIT: 'app-mode',
  HEADER_IMPLICIT: 'x-app-mode',
} as const;
