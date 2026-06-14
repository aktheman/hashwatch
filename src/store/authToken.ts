let _getToken: () => string | null = () => null;
const _onLoginCallbacks: Array<() => void> = [];

export function setTokenGetter(fn: () => string | null): void {
  _getToken = fn;
}

export function getAuthToken(): string | null {
  return _getToken();
}

export function onAuthLogin(fn: () => void): void {
  _onLoginCallbacks.push(fn);
}

export function notifyAuthLogin(): void {
  _onLoginCallbacks.forEach((fn) => fn());
}
