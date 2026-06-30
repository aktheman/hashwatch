import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

// Tests for coverage edge cases that are documented as hard-to-test.
// useSyncExternalStore cleanup on unmount is not triggered by renderHook,
// so matchMedia removeEventListener is tested in theme.test.ts (mount only).

describe('useTheme subscribe cleanup', () => {
  it('unmount does not throw when mode is not system', async () => {
    const { setThemeMode, useTheme } = await import('../src/theme');
    setThemeMode('dark');
    const { unmount } = await renderHook(() => useTheme());
    expect(() => unmount()).not.toThrow();
  });

  it('handles non-system mode unmount on web', async () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
    (globalThis as any).window = {};
    const { setThemeMode, useTheme } = await import('../src/theme');
    setThemeMode('dark');
    const { unmount } = await renderHook(() => useTheme());
    expect(() => unmount()).not.toThrow();
    Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true, writable: true });
    delete (globalThis as any).window;
  });

  it('does not crash when matchMedia is absent on web with system mode', async () => {
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
    (globalThis as any).window = {};
    const { setThemeMode, useTheme } = await import('../src/theme');
    setThemeMode('system');
    const { unmount } = await renderHook(() => useTheme());
    expect(() => unmount()).not.toThrow();
    Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true, writable: true });
    delete (globalThis as any).window;
  });
});
