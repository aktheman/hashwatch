const noop = () => undefined;

export class EventEmitter {
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  addListener = <EventName extends string>(
    eventName: EventName,
    listener: (...args: unknown[]) => void,
  ) => {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push(listener);
    return { remove: () => this.removeAllListeners(eventName) };
  };
  removeListener = (eventName: string, listener: (...args: unknown[]) => void) => {
    const arr = this.listeners[eventName];
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx >= 0) arr.splice(idx, 1);
    }
  };
  removeAllListeners = (eventName?: string) => {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  };
  emit = (eventName: string, ...args: unknown[]) => {
    this.listeners[eventName]?.forEach((l) => l(...args));
  };
  listenerCount = (eventName: string) => this.listeners[eventName]?.length ?? 0;
}

export class NativeModule extends EventEmitter {
  static registerModule = noop;
}

export class SharedObject extends EventEmitter {
  release = noop;
}
export class SharedRef {
  nativeRefType = 'unknown';
  release = noop;
  addListener = () => ({ remove: noop });
  removeListener = noop;
  removeAllListeners = noop;
  emit = noop;
  listenerCount = () => 0;
}

export class CodedError extends Error {
  code: string;
  info?: unknown;
  constructor(code: string, message: string, info?: unknown) {
    super(message);
    this.code = code;
    this.name = 'CodedError';
    this.info = info;
  }
}

export class UnavailabilityError extends CodedError {
  constructor(moduleName: string, propertyName: string) {
    super(
      'ERR_UNAVAILABLE',
      `The method or property ${moduleName}.${propertyName} is not available on this platform, OS: web`,
    );
    this.name = 'UnavailabilityError';
  }
}

export class LegacyEventEmitter {
  private _nativeModule: object;
  constructor(nativeModule: object) {
    this._nativeModule = nativeModule;
  }
  addListener = () => ({ remove: noop });
  removeAllListeners = noop;
}

const nativeModuleRegistry: Record<string, object> = {};

function initGlobalExpo(): void {
  if (typeof globalThis.expo !== 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).expo = {
    EventEmitter,
    NativeModule,
    SharedObject,
    SharedRef,
    modules: {},
    uuidv4: uuid.v4,
    uuidv5: uuid.v5,
    reloadAppAsync: async () => {},
    installOnUIRuntime: noop,
  };
}

initGlobalExpo();

const expoMods = (globalThis as { expo?: { modules: Record<string, object> } }).expo?.modules ?? {};

export function requireNativeModule(moduleName: string): object {
  const mod = expoMods[moduleName] ?? nativeModuleRegistry[moduleName];
  if (!mod) {
    throw new CodedError('ERR_MODULE_NOT_FOUND', `Cannot find native module '${moduleName}'`);
  }
  return mod;
}

export function requireOptionalNativeModule(moduleName: string): object | null {
  return expoMods[moduleName] ?? nativeModuleRegistry[moduleName] ?? null;
}

export function requireNativeViewManager(_viewName: string): object {
  throw new UnavailabilityError('expo-modules-core', 'requireNativeViewManager');
}

export function registerWebModule(impl: new () => object, name: string): void {
  const instance = new impl();
  expoMods[name] = instance;
  nativeModuleRegistry[name] = instance;
}

export async function reloadAppAsync(_reason: string): Promise<void> {}

export function installOnUIRuntime(): void {}

export const Platform = {
  OS: 'web' as const,
  select: <T>(spec: { native?: T; web?: T; default?: T }): T | undefined =>
    spec.web ?? spec.default ?? undefined,
  isDOMAvailable: true,
  canUseEventListeners: true,
  canUseViewport: true,
  isAsyncDebugging: false,
};

export const uuid = {
  v4: () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }),
  v5: () =>
    'xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }),
  namespace: {} as Record<string, string>,
};

export function createPermissionHook(_permission: unknown) {
  return () => [{ granted: true }, noop] as const;
}

export enum PermissionStatus {
  GRANTED = 'granted',
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
}

export type EventSubscription = { remove: () => void };

export function createSnapshotFriendlyRef<T>(initialValue: T): { current: T } {
  return { current: initialValue };
}

export function useReleasingSharedObject<T>(_factory: () => T, _deps: unknown[]): T | null {
  return null;
}

const NativeModulesProxy: Record<string, object> = {};
export default NativeModulesProxy;
