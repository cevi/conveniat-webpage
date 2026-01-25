export enum OnboardingStep {
  Initial = 0,
  Login = 1,
  PushNotifications = 2,
  Loading = 3,
  Checking = 4,
  OfflineContent = 5,
  NoInternet = 6,
}

export enum OnboardingAction {
  UPDATE_CONTEXT = 'UPDATE_CONTEXT',
  EVALUATE_NEXT_STEP = 'EVALUATE_NEXT_STEP',
  USER_ACTION_ACCEPT_COOKIES = 'USER_ACTION_ACCEPT_COOKIES',
  USER_ACTION_SKIP_LOGIN = 'USER_ACTION_SKIP_LOGIN',
  USER_ACTION_SKIP_PUSH = 'USER_ACTION_SKIP_PUSH',
  USER_ACTION_HANDLE_OFFLINE = 'USER_ACTION_HANDLE_OFFLINE',
}
