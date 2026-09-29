import {
  isUrgentKind,
  MAX_DELIVERY_ATTEMPTS,
  nextAttemptAfterFailure,
  PUSH_PRIORITY,
  PUSH_TIME_TO_LIVE_SECONDS,
} from '@/lib/push/push-delivery-policy';

const now = new Date('2027-07-25T08:00:00Z');
const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
/** No jitter, so the schedule itself is what is asserted. */
const noJitter = (): number => 0.5;

const secondsUntil = (date: Date | undefined): number | undefined =>
  date === undefined ? undefined : (date.getTime() - now.getTime()) / 1000;

describe('nextAttemptAfterFailure', () => {
  it('backs off further after every failed attempt', () => {
    const delays = [1, 2, 3, 4].map((attempts) =>
      secondsUntil(
        nextAttemptAfterFailure({ attempts, now, expiresAt: inOneDay, random: noJitter }),
      ),
    );

    expect(delays).toEqual([60, 300, 900, 1800]);
  });

  it('gives up once a delivery used all of its attempts', () => {
    expect(
      nextAttemptAfterFailure({
        attempts: MAX_DELIVERY_ATTEMPTS,
        now,
        expiresAt: inOneDay,
        random: noJitter,
      }),
    ).toBeUndefined();
  });

  // A retry the push service would drop on arrival only costs a request.
  it('gives up when the next attempt would come after the push expired', () => {
    const inTwoMinutes = new Date(now.getTime() + 2 * 60 * 1000);

    expect(
      nextAttemptAfterFailure({ attempts: 2, now, expiresAt: inTwoMinutes, random: noJitter }),
    ).toBeUndefined();
  });

  it('waits at least as long as the push service asked with Retry-After', () => {
    const next = nextAttemptAfterFailure({
      attempts: 1,
      now,
      expiresAt: inOneDay,
      retryAfterSeconds: 600,
      random: noJitter,
    });

    expect(secondsUntil(next)).toBe(600);
  });

  it('spreads retries by at most a fifth of the delay', () => {
    const earliest = nextAttemptAfterFailure({
      attempts: 1,
      now,
      expiresAt: inOneDay,
      random: () => 0,
    });
    const latest = nextAttemptAfterFailure({
      attempts: 1,
      now,
      expiresAt: inOneDay,
      random: () => 1,
    });

    expect([secondsUntil(earliest), secondsUntil(latest)]).toEqual([48, 72]);
  });
});

describe('push delivery policy', () => {
  it('claims an alert first, a chat message next and a broadcast last', () => {
    expect(PUSH_PRIORITY.EMERGENCY).toBeGreaterThan(PUSH_PRIORITY.SUPPORT);
    expect(PUSH_PRIORITY.SUPPORT).toBeGreaterThan(PUSH_PRIORITY.CHAT);
    expect(PUSH_PRIORITY.CHAT).toBeGreaterThan(PUSH_PRIORITY.ANNOUNCEMENT);
  });

  it('treats emergency and support pushes as urgent, and nothing else', () => {
    expect(
      (['EMERGENCY', 'SUPPORT', 'CHAT', 'ANNOUNCEMENT', 'SYSTEM'] as const).filter((kind) =>
        isUrgentKind(kind),
      ),
    ).toEqual(['EMERGENCY', 'SUPPORT']);
  });

  // An alert that reaches a phone switched on hours later sends someone to an emergency
  // that is long over.
  it('keeps an emergency deliverable for an hour, and a chat message for a day', () => {
    expect(PUSH_TIME_TO_LIVE_SECONDS.EMERGENCY).toBe(3600);
    expect(PUSH_TIME_TO_LIVE_SECONDS.CHAT).toBe(86_400);
  });
});
