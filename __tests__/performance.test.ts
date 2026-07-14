import {
  trackRender,
  trackApiCall,
  getRenderMetrics,
  getApiMetrics,
  getSlowRenders,
  getSlowApiCalls,
  getAverageRenderTime,
  getAverageApiTime,
  clearMetrics,
  startTiming,
  markRenderStart,
  markRenderEnd,
  getActiveRenders,
} from '../src/utils/performance';

beforeEach(() => {
  clearMetrics();
});

describe('performance utils', () => {
  test('trackRender adds metric', () => {
    trackRender('TestComponent', 25);
    expect(getRenderMetrics()).toHaveLength(1);
    expect(getRenderMetrics()[0].name).toBe('TestComponent');
    expect(getRenderMetrics()[0].duration).toBe(25);
  });

  test('trackApiCall adds metric', () => {
    trackApiCall('/api/miners', 'GET', 200, 150);
    expect(getApiMetrics()).toHaveLength(1);
    expect(getApiMetrics()[0].url).toBe('/api/miners');
    expect(getApiMetrics()[0].status).toBe(200);
  });

  test('getSlowRenders filters by threshold', () => {
    trackRender('Fast', 5);
    trackRender('Slow', 25);
    trackRender('Medium', 16);
    expect(getSlowRenders()).toHaveLength(1);
    expect(getSlowRenders()[0].name).toBe('Slow');
  });

  test('getSlowApiCalls filters by threshold', () => {
    trackApiCall('/fast', 'GET', 200, 100);
    trackApiCall('/slow', 'GET', 200, 5000);
    expect(getSlowApiCalls()).toHaveLength(1);
    expect(getSlowApiCalls()[0].url).toBe('/slow');
  });

  test('getAverageRenderTime overall', () => {
    trackRender('A', 10);
    trackRender('B', 20);
    expect(getAverageRenderTime()).toBe(15);
  });

  test('getAverageRenderTime by name', () => {
    trackRender('A', 10);
    trackRender('B', 30);
    trackRender('A', 20);
    expect(getAverageRenderTime('A')).toBe(15);
  });

  test('getAverageRenderTime empty', () => {
    expect(getAverageRenderTime()).toBe(0);
  });

  test('getAverageApiTime', () => {
    trackApiCall('/a', 'GET', 200, 100);
    trackApiCall('/b', 'GET', 200, 300);
    expect(getAverageApiTime()).toBe(200);
  });

  test('getAverageApiTime empty', () => {
    expect(getAverageApiTime()).toBe(0);
  });

  test('clearMetrics empties both', () => {
    trackRender('X', 10);
    trackApiCall('/x', 'GET', 200, 10);
    clearMetrics();
    expect(getRenderMetrics()).toHaveLength(0);
    expect(getApiMetrics()).toHaveLength(0);
  });

  test('startTiming returns duration', () => {
    const end = startTiming('test');
    expect(typeof end).toBe('function');
    const duration = end();
    expect(typeof duration).toBe('number');
    expect(getRenderMetrics()).toHaveLength(1);
    expect(getRenderMetrics()[0].name).toBe('test');
  });

  test('limits metrics to 100 entries', () => {
    for (let i = 0; i < 120; i++) {
      trackRender(`Comp${i}`, i);
    }
    expect(getRenderMetrics()).toHaveLength(100);
  });

  test('markRenderStart and markRenderEnd track a render', () => {
    markRenderStart('MyComponent');
    const duration = markRenderEnd('MyComponent');
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(getRenderMetrics()).toHaveLength(1);
    expect(getRenderMetrics()[0].name).toBe('MyComponent');
    expect(getRenderMetrics()[0].duration).toBe(duration);
  });

  test('markRenderEnd returns 0 for unknown component', () => {
    const duration = markRenderEnd('Unknown');
    expect(duration).toBe(0);
    expect(getRenderMetrics()).toHaveLength(0);
  });

  test('getActiveRenders returns currently tracked components', () => {
    markRenderStart('A');
    markRenderStart('B');
    expect(getActiveRenders()).toEqual(expect.arrayContaining(['A', 'B']));
    expect(getActiveRenders()).toHaveLength(2);
    markRenderEnd('A');
    expect(getActiveRenders()).toEqual(['B']);
    markRenderEnd('B');
    expect(getActiveRenders()).toHaveLength(0);
  });

  test('clearMetrics clears active render timers', () => {
    markRenderStart('X');
    markRenderStart('Y');
    expect(getActiveRenders()).toHaveLength(2);
    clearMetrics();
    expect(getActiveRenders()).toHaveLength(0);
  });
});
