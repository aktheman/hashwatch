interface MetricEntry {
  name: string;
  duration: number;
  timestamp: number;
}

interface ApiMetricEntry {
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
}

const renderMetrics: MetricEntry[] = [];
const apiMetrics: ApiMetricEntry[] = [];
const MAX_ENTRIES = 100;
const SLOW_RENDER_THRESHOLD = 16;

const activeRenderTimers = new Map<string, number>();

export function trackRender(name: string, duration: number): void {
  renderMetrics.push({ name, duration, timestamp: Date.now() });
  if (renderMetrics.length > MAX_ENTRIES) renderMetrics.shift();
  if (__DEV__ && duration > SLOW_RENDER_THRESHOLD) {
    console.warn(
      `[Perf] Slow render: ${name} took ${duration.toFixed(1)}ms (threshold: ${SLOW_RENDER_THRESHOLD}ms)`,
    );
  }
}

export function trackApiCall(url: string, method: string, status: number, duration: number): void {
  apiMetrics.push({ url, method, status, duration, timestamp: Date.now() });
  if (apiMetrics.length > MAX_ENTRIES) apiMetrics.shift();
}

export function getRenderMetrics(): MetricEntry[] {
  return [...renderMetrics];
}

export function getApiMetrics(): ApiMetricEntry[] {
  return [...apiMetrics];
}

export function getSlowRenderThreshold(): number {
  return SLOW_RENDER_THRESHOLD;
}

export function getSlowApiThreshold(): number {
  return 3000;
}

export function getSlowRenders(): MetricEntry[] {
  return renderMetrics.filter((m) => m.duration > getSlowRenderThreshold());
}

export function getSlowApiCalls(): ApiMetricEntry[] {
  return apiMetrics.filter((m) => m.duration > getSlowApiThreshold());
}

export function getAverageRenderTime(name?: string): number {
  const filtered = name ? renderMetrics.filter((m) => m.name === name) : renderMetrics;
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length;
}

export function getAverageApiTime(): number {
  if (apiMetrics.length === 0) return 0;
  return apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length;
}

export function clearMetrics(): void {
  renderMetrics.length = 0;
  apiMetrics.length = 0;
  activeRenderTimers.clear();
}

export function startTiming(name: string): () => number {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    trackRender(name, duration);
    return duration;
  };
}

export function markRenderStart(componentName: string): void {
  activeRenderTimers.set(componentName, performance.now());
}

export function markRenderEnd(componentName: string): number {
  const start = activeRenderTimers.get(componentName);
  if (start === undefined) return 0;
  activeRenderTimers.delete(componentName);
  const duration = performance.now() - start;
  trackRender(componentName, duration);
  return duration;
}

export function getActiveRenders(): string[] {
  return Array.from(activeRenderTimers.keys());
}
