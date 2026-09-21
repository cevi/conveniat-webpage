import type { NativeAppInfo } from '@/hooks/use-native-app-info';
import { registerPostHogSuperProperties } from '@/utils/posthog-super-properties';
import type { PostHog } from 'posthog-js';

jest.mock('@/build', () => ({
  __esModule: true,
  default: {
    version: '1.3.2',
    timestamp: 'Thu Aug 13 2026 15:49:12 GMT+0000 (UTC)',
    git: { branch: 'main', hash: 'abc12345' },
  },
}));

const NATIVE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KonektaApp/1.0';
const SAFARI_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const NATIVE_APP_INFO: NativeAppInfo = {
  version: '1.4.0',
  buildNumber: '211',
  platform: 'ios',
};

type RegisterMock = jest.Mock<void, [Record<string, unknown>]>;
type UnregisterMock = jest.Mock<void, [string]>;

interface TestClient {
  client: PostHog;
  register: RegisterMock;
  unregister: UnregisterMock;
}

const setUserAgent = (userAgent: string): void => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent },
    configurable: true,
    writable: true,
  });
};

const setNativeAppInfo = (info: NativeAppInfo | undefined): void => {
  Object.defineProperty(globalThis, 'AppWebViewNativeApp', {
    value: info,
    configurable: true,
    writable: true,
  });
};

const createClient = (registerImplementation?: () => void): TestClient => {
  const register = jest.fn<void, [Record<string, unknown>]>(registerImplementation);
  const unregister = jest.fn<void, [string]>();
  return { client: { register, unregister } as unknown as PostHog, register, unregister };
};

/** Every property key handed to `register()`, flattened across all calls. */
const registeredKeys = (register: RegisterMock): string[] =>
  register.mock.calls.flatMap((call) => Object.keys(call[0]));

describe('registerPostHogSuperProperties', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setNativeAppInfo(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    setNativeAppInfo(undefined);
  });

  it('registers the web build version and commit hash on every client', () => {
    setUserAgent(SAFARI_USER_AGENT);
    const { client, register } = createClient();

    registerPostHogSuperProperties(client);

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        is_native_app: false,
        $app_version: '1.3.2',
        web_commit_hash: 'abc12345',
      }),
    );
  });

  it('registers the native wrapper build when the bridge is present', () => {
    setUserAgent(NATIVE_USER_AGENT);
    setNativeAppInfo(NATIVE_APP_INFO);
    const { client, register, unregister } = createClient();

    registerPostHogSuperProperties(client);

    expect(register).toHaveBeenCalledWith({
      native_app_version: '1.4.0',
      native_build_number: '211',
    });
    expect(unregister).not.toHaveBeenCalled();
  });

  it('clears stale native properties outside the native app', () => {
    setUserAgent(SAFARI_USER_AGENT);
    const { client, unregister } = createClient();

    registerPostHogSuperProperties(client);

    expect(unregister).toHaveBeenCalledWith('native_app_version');
    expect(unregister).toHaveBeenCalledWith('native_build_number');
  });

  it('picks the bridge up when it is injected after init', () => {
    setUserAgent(NATIVE_USER_AGENT);
    const { client, register } = createClient();

    registerPostHogSuperProperties(client);
    expect(registeredKeys(register)).not.toContain('native_app_version');

    setNativeAppInfo(NATIVE_APP_INFO);
    jest.advanceTimersByTime(500);

    expect(register).toHaveBeenCalledWith({
      native_app_version: '1.4.0',
      native_build_number: '211',
    });
  });

  it('gives up and reports no version when the bridge never appears', () => {
    setUserAgent(NATIVE_USER_AGENT);
    const { client, unregister } = createClient();

    registerPostHogSuperProperties(client);
    jest.advanceTimersByTime(500 * 10);

    expect(unregister).toHaveBeenCalledWith('native_app_version');
    expect(unregister).toHaveBeenCalledWith('native_build_number');
  });

  it('stops polling once disposed', () => {
    setUserAgent(NATIVE_USER_AGENT);
    const { client, register } = createClient();

    const dispose = registerPostHogSuperProperties(client);
    dispose();

    setNativeAppInfo(NATIVE_APP_INFO);
    jest.advanceTimersByTime(500 * 10);

    expect(registeredKeys(register)).not.toContain('native_app_version');
  });

  it('ignores a bridge object with unusable values', () => {
    setUserAgent(NATIVE_USER_AGENT);
    setNativeAppInfo({ version: '', buildNumber: '   ', platform: 'ios' });
    const { client, register } = createClient();

    registerPostHogSuperProperties(client);
    jest.advanceTimersByTime(500 * 10);

    expect(registeredKeys(register)).not.toContain('native_app_version');
  });

  // The point of these two: telemetry setup must never be able to break PostHog
  // initialisation, because that would take exception capture down with it.
  it('never throws when the client rejects the call', () => {
    setUserAgent(NATIVE_USER_AGENT);
    const { client } = createClient(() => {
      throw new Error('posthog exploded');
    });

    expect(() => registerPostHogSuperProperties(client)).not.toThrow();
  });

  it('never throws when reading the bridge global throws', () => {
    setUserAgent(NATIVE_USER_AGENT);
    Object.defineProperty(globalThis, 'AppWebViewNativeApp', {
      get: (): NativeAppInfo => {
        throw new Error('web content process is gone');
      },
      configurable: true,
    });
    const { client, register } = createClient();

    expect(() => registerPostHogSuperProperties(client)).not.toThrow();
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ is_native_app: true }));
  });
});
