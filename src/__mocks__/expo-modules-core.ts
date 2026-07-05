const noop = () => undefined;

export class EventEmitter {
  constructor() {}
  addListener = () => ({ remove: noop });
  removeAllListeners = noop;
  emit = noop;
  listenerCount = () => 0;
}

export class NativeModule {
  static registerModule = noop;
}

export class SharedObject {}
export class SharedRef {}

export class CodedError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'CodedError';
  }
}

export class UnavailabilityError extends CodedError {
  constructor(moduleName: string, propertyName: string) {
    super(
      'ERR_UNAVAILABLE',
      `The method or property ${moduleName}.${propertyName} is not available on this platform`,
    );
    this.name = 'UnavailabilityError';
  }
}

export class LegacyEventEmitter {
  constructor() {}
  addListener = () => ({ remove: noop });
  removeAllListeners = noop;
}

const nativeModuleRegistry: Record<string, object> = {};

export function requireNativeModule(moduleName: string): object {
  const mod = nativeModuleRegistry[moduleName];
  if (!mod) {
    throw new CodedError('ERR_MODULE_NOT_FOUND', `Cannot find native module '${moduleName}'`);
  }
  return mod;
}

export function requireOptionalNativeModule(moduleName: string): object | null {
  return nativeModuleRegistry[moduleName] || null;
}

export function requireNativeViewManager(_viewName: string): object {
  return {};
}

export function registerWebModule(impl: object, name: string): void {
  nativeModuleRegistry[name] = impl;
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

const NativeModulesProxy: Record<string, object> = {};
export default NativeModulesProxy;
