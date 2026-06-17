import { setTokenGetter, getAuthToken, onAuthLogin, notifyAuthLogin } from '../src/store/authToken';

beforeEach(() => {
  setTokenGetter(() => null);
});

describe('getAuthToken', () => {
  it('returns null with no getter set', () => {
    setTokenGetter(() => null);
    expect(getAuthToken()).toBeNull();
  });

  it('returns token from custom getter', () => {
    setTokenGetter(() => 'abc123');
    expect(getAuthToken()).toBe('abc123');
  });

  it('returns updated value when getter changes', () => {
    setTokenGetter(() => 'first');
    expect(getAuthToken()).toBe('first');
    setTokenGetter(() => 'second');
    expect(getAuthToken()).toBe('second');
  });
});

describe('notifyAuthLogin', () => {
  it('calls all registered callbacks', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    onAuthLogin(cb1);
    onAuthLogin(cb2);
    notifyAuthLogin();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('calls callback each time login is notified', () => {
    const cb = jest.fn();
    onAuthLogin(cb);
    notifyAuthLogin();
    notifyAuthLogin();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('does not fail when no callbacks are registered', () => {
    expect(() => notifyAuthLogin()).not.toThrow();
  });
});
