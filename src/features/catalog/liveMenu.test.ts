import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureMenu } from '../../test/menuFixture';
import { startLiveMenu, type LiveMenuState } from './liveMenu';
import type { MenuSource, MenuSubscription } from './types';

function fakeSource() {
  let version = 1;
  let failing = false;
  let subscription: MenuSubscription | undefined;
  const unsubscribe = vi.fn();

  const source = {
    load: vi.fn(() =>
      failing ? Promise.reject(new Error('offline')) : Promise.resolve(fixtureMenu(version)),
    ),
    loadVersion: vi.fn(() =>
      failing ? Promise.reject(new Error('offline')) : Promise.resolve(version),
    ),
    subscribe: vi.fn((handlers: MenuSubscription) => {
      subscription = handlers;
      return unsubscribe;
    }),
  } satisfies MenuSource;

  return {
    source,
    unsubscribe,
    /** A staff change: the database bumps the version and, if live, sends an event. */
    change({ notify = true } = {}) {
      version += 1;
      if (notify) subscription?.onChange();
    },
    status(value: 'live' | 'down') {
      subscription?.onStatus(value);
    },
    fail(value: boolean) {
      failing = value;
    },
  };
}

function start(source: MenuSource) {
  const states: LiveMenuState[] = [];
  const live = startLiveMenu(source, (state) => states.push(state));
  const last = () => states.at(-1);
  return { live, states, last };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startLiveMenu (FR-06, FR-09, D-020)', () => {
  it('starts in the loading state, then shows the menu', async () => {
    const fake = fakeSource();
    const { states, last } = start(fake.source);
    expect(states[0]).toEqual({ status: 'loading', paused: false });
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toMatchObject({ status: 'ready', paused: false });
    expect(fake.source.load).toHaveBeenCalledTimes(1);
  });

  it('reloads 300 ms after the last change event, once per burst', async () => {
    const fake = fakeSource();
    const { last } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);

    fake.change();
    await vi.advanceTimersByTimeAsync(200);
    fake.change();
    await vi.advanceTimersByTimeAsync(200);
    fake.change();
    await vi.advanceTimersByTimeAsync(299);
    expect(fake.source.load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fake.source.load).toHaveBeenCalledTimes(2);
    expect(last()).toMatchObject({ status: 'ready', menu: { version: 4 } });
  });

  it('checks the version when the subscription starts, and reloads only if it changed', async () => {
    const fake = fakeSource();
    start(fake.source);
    await vi.advanceTimersByTimeAsync(0);

    fake.status('live');
    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.source.loadVersion).toHaveBeenCalledTimes(1);
    expect(fake.source.load).toHaveBeenCalledTimes(1);

    // A change that happened before the next subscription, with no event.
    fake.change({ notify: false });
    fake.status('live');
    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.source.load).toHaveBeenCalledTimes(2);
  });

  it('pauses and polls every 10 seconds while the live connection is down', async () => {
    const fake = fakeSource();
    const { last } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);

    fake.status('down');
    expect(last()).toMatchObject({ status: 'ready', paused: true });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fake.source.loadVersion).toHaveBeenCalledTimes(1);
    expect(fake.source.load).toHaveBeenCalledTimes(1);

    fake.change({ notify: false });
    await vi.advanceTimersByTimeAsync(10_300);
    expect(fake.source.load).toHaveBeenCalledTimes(2);
    expect(last()).toMatchObject({ paused: true, menu: { version: 2 } });
  });

  it('stops polling and catches up when the connection comes back', async () => {
    const fake = fakeSource();
    const { last } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);
    fake.status('down');
    fake.change({ notify: false });

    fake.status('live');
    await vi.advanceTimersByTimeAsync(300);
    expect(last()).toMatchObject({ paused: false, menu: { version: 2 } });

    const checks = fake.source.loadVersion.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fake.source.loadVersion).toHaveBeenCalledTimes(checks);
  });

  it('shows the error state when the first load fails, and recovers on retry', async () => {
    const fake = fakeSource();
    fake.fail(true);
    const { live, last } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ status: 'error', paused: false });

    fake.fail(false);
    live.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toMatchObject({ status: 'ready' });
  });

  it('retries a failed first load by itself when the live connection comes up', async () => {
    const fake = fakeSource();
    fake.fail(true);
    const { last } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);
    fake.fail(false);
    fake.status('live');
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toMatchObject({ status: 'ready' });
  });

  it('keeps the last good menu when a reload fails', async () => {
    const fake = fakeSource();
    const { last } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);
    fake.fail(true);
    fake.change();
    await vi.advanceTimersByTimeAsync(300);
    expect(last()).toMatchObject({ status: 'ready', menu: { version: 1 } });
  });

  it('stops listening and publishing when stopped', async () => {
    const fake = fakeSource();
    const { live, states } = start(fake.source);
    await vi.advanceTimersByTimeAsync(0);
    fake.status('down');
    const count = states.length;

    live.stop();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    fake.change();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(states).toHaveLength(count);
    expect(fake.source.loadVersion).not.toHaveBeenCalled();
  });
});
