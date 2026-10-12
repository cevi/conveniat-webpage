import { endpointHostOf, isPushServiceEndpoint } from '@/lib/push/push-endpoint';

describe('isPushServiceEndpoint', () => {
  it.each([
    ['Chrome', 'https://fcm.googleapis.com/fcm/send/dQw4w9:APA91bHq-_x'],
    ['Chrome on its second host', 'https://jmt17.google.com/fcm/send/dQw4w9:APA91bHq-_x'],
    ['Firefox', 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABl-_x'],
    ['Safari', 'https://web.push.apple.com/QGuEyvAn9hLk1a'],
    ['Edge', 'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAD%2bKq4%3d'],
  ])('accepts an endpoint of %s', (_browser, endpoint) => {
    expect(isPushServiceEndpoint(endpoint)).toBe(true);
  });

  it.each([
    ['a service inside the cluster', 'https://payload:3000/api/users'],
    ['an address in the private network', 'https://10.0.0.13/'],
    ['a host of the caller', 'https://push.example.test/abc'],
    ['a push service as a subdomain of another host', 'https://fcm.googleapis.com.example.test/'],
    ['a host that only ends like a push service', 'https://evilpush.apple.com/abc'],
    ['plain HTTP', 'http://fcm.googleapis.com/fcm/send/abc'],
    ['another port', 'https://fcm.googleapis.com:8443/fcm/send/abc'],
    ['a push service as the user name', 'https://fcm.googleapis.com@example.test/abc'],
    ['a backslash before the real host', String.raw`https://example.test\@fcm.googleapis.com/abc`],
    ['a host in capitals', 'https://FCM.googleapis.com/fcm/send/abc'],
    ['no URL at all', 'fcm.googleapis.com/fcm/send/abc'],
    ['an empty string', ''],
    ['nothing', undefined],
  ])('refuses %s', (_case, endpoint) => {
    expect(isPushServiceEndpoint(endpoint)).toBe(false);
  });
});

describe('endpointHostOf', () => {
  it('names the host and leaves the secret path out of the log line', () => {
    expect(endpointHostOf('https://web.push.apple.com/QGuEyvAn9hLk1a')).toBe('web.push.apple.com');
  });

  it('has no host for something that is not a URL', () => {
    expect(endpointHostOf('not a url')).toBeUndefined();
    expect(endpointHostOf(42)).toBeUndefined();
  });
});
