import { useActivityFeedStore } from '../src/store/activityFeed';
import type { ActivityType } from '../src/store/activityFeed';

beforeEach(() => {
  useActivityFeedStore.setState({ events: [] });
});

const baseEvent = {
  type: 'miner_online' as ActivityType,
  title: 'Miner Online',
  description: 'Miner is back online',
  severity: 'info' as const,
  minerId: 'miner-1',
  minerName: 'Test Miner',
};

it('starts with empty events array', () => {
  expect(useActivityFeedStore.getState().events).toEqual([]);
});

it('addEvent adds an event with generated id and timestamp', () => {
  useActivityFeedStore.getState().addEvent(baseEvent);
  const events = useActivityFeedStore.getState().events;
  expect(events).toHaveLength(1);
  expect(events[0].id).toBeTruthy();
  expect(typeof events[0].id).toBe('string');
  expect(events[0].timestamp).toBeGreaterThan(0);
});

it('addEvent sets read to false', () => {
  useActivityFeedStore.getState().addEvent(baseEvent);
  expect(useActivityFeedStore.getState().events[0].read).toBe(false);
});

it('addEvent prepends new events (newest first)', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'First' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'Second' });
  const events = useActivityFeedStore.getState().events;
  expect(events[0].title).toBe('Second');
  expect(events[1].title).toBe('First');
});

it('addEvent limits to 500 events (MAX_EVENTS)', () => {
  for (let i = 0; i < 510; i++) {
    useActivityFeedStore.getState().addEvent({ ...baseEvent, title: `Event ${i}` });
  }
  expect(useActivityFeedStore.getState().events).toHaveLength(500);
  expect(useActivityFeedStore.getState().events[0].title).toBe('Event 509');
});

it('markRead sets specific event to read', () => {
  useActivityFeedStore.getState().addEvent(baseEvent);
  const id = useActivityFeedStore.getState().events[0].id;
  useActivityFeedStore.getState().markRead(id);
  expect(useActivityFeedStore.getState().events[0].read).toBe(true);
});

it('markRead does not affect other events', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'First' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'Second' });
  const id = useActivityFeedStore.getState().events[0].id;
  useActivityFeedStore.getState().markRead(id);
  expect(useActivityFeedStore.getState().events[0].read).toBe(true);
  expect(useActivityFeedStore.getState().events[1].read).toBe(false);
});

it('markAllRead marks all events as read', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'A' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'B' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'C' });
  useActivityFeedStore.getState().markAllRead();
  const allRead = useActivityFeedStore.getState().events.every((e) => e.read);
  expect(allRead).toBe(true);
});

it('clearEvents empties the array', () => {
  useActivityFeedStore.getState().addEvent(baseEvent);
  useActivityFeedStore.getState().addEvent(baseEvent);
  useActivityFeedStore.getState().clearEvents();
  expect(useActivityFeedStore.getState().events).toEqual([]);
});

it('getUnreadCount returns 0 when empty', () => {
  expect(useActivityFeedStore.getState().getUnreadCount()).toBe(0);
});

it('getUnreadCount returns correct count', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'A' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'B' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'C' });
  expect(useActivityFeedStore.getState().getUnreadCount()).toBe(3);
});

it('getUnreadCount after markAllRead returns 0', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'A' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'B' });
  useActivityFeedStore.getState().markAllRead();
  expect(useActivityFeedStore.getState().getUnreadCount()).toBe(0);
});

it('getByMiner returns events for specific miner', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, minerId: 'miner-1', title: 'A' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, minerId: 'miner-2', title: 'B' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, minerId: 'miner-1', title: 'C' });
  const result = useActivityFeedStore.getState().getByMiner('miner-1');
  expect(result).toHaveLength(2);
  expect(result.every((e) => e.minerId === 'miner-1')).toBe(true);
});

it('getByMiner returns empty array for unknown miner', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, minerId: 'miner-1' });
  expect(useActivityFeedStore.getState().getByMiner('unknown-miner')).toEqual([]);
});

it('addEvent with different types stores correctly', () => {
  const types: ActivityType[] = [
    'miner_online',
    'miner_offline',
    'alert_fired',
    'firmware_updated',
    'pool_switched',
  ];
  types.forEach((type) => {
    useActivityFeedStore.getState().addEvent({ ...baseEvent, type });
  });
  const events = useActivityFeedStore.getState().events;
  expect(events).toHaveLength(5);
  expect(events.map((e) => e.type)).toEqual(types.slice().reverse());
});

it('multiple addEvent calls maintain chronological order', () => {
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'First' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'Second' });
  useActivityFeedStore.getState().addEvent({ ...baseEvent, title: 'Third' });
  const events = useActivityFeedStore.getState().events;
  expect(events[0].title).toBe('Third');
  expect(events[1].title).toBe('Second');
  expect(events[2].title).toBe('First');
  expect(events[0].timestamp).toBeGreaterThanOrEqual(events[1].timestamp);
  expect(events[1].timestamp).toBeGreaterThanOrEqual(events[2].timestamp);
});
