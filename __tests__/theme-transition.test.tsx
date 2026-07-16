import { render, renderHook } from '@testing-library/react-native';
import React from 'react';
import {
  switchThemeWithTransition,
  ThemeTransitionOverlay,
  ThemeTransitionProvider,
  useThemeTransition,
} from '../src/components/ThemeTransitionOverlay';
import { setTheme, darkTheme } from '../src/theme';

beforeEach(() => {
  setTheme(darkTheme);
});

describe('switchThemeWithTransition', () => {
  it('is a function', () => {
    expect(typeof switchThemeWithTransition).toBe('function');
  });

  it('invokes the callback', () => {
    const cb = jest.fn();
    switchThemeWithTransition(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not throw when called', () => {
    expect(() => switchThemeWithTransition(() => {})).not.toThrow();
  });
});

describe('ThemeTransitionOverlay', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await render(<ThemeTransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('is a component', () => {
    expect(typeof ThemeTransitionOverlay).toBe('function');
  });
});

describe('useThemeTransition', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeTransitionProvider>{children}</ThemeTransitionProvider>
  );

  it('returns a function inside ThemeTransitionProvider', async () => {
    const { result } = await renderHook(() => useThemeTransition(), { wrapper });
    expect(typeof result.current).toBe('function');
  });

  it('falls back to direct call outside provider', async () => {
    const { result } = await renderHook(() => useThemeTransition());
    const cb = jest.fn();
    result.current(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
