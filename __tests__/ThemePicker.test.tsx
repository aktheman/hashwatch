import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemePicker } from '../src/components/ThemePicker';
import * as themeModule from '../src/theme';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ visible, children }: any) =>
      visible ? R.createElement(R.Fragment, null, children) : null,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

describe('ThemePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    themeModule.setThemeMode('dark');
  });

  it('renders all 14 theme options', async () => {
    const r = await render(<ThemePicker />);
    const buttons = r.getAllByRole('button');
    expect(buttons.length).toBe(14);
  });

  it('calls setThemeMode when a theme is pressed', async () => {
    const spy = jest.spyOn(themeModule, 'setThemeMode');
    const r = await render(<ThemePicker />);
    const buttons = r.getAllByRole('button');
    fireEvent.press(buttons[2]);
    expect(spy).toHaveBeenCalledWith('light');
    spy.mockRestore();
  });

  it('calls onThemeChange callback', async () => {
    const onThemeChange = jest.fn();
    const r = await render(<ThemePicker onThemeChange={onThemeChange} />);
    const buttons = r.getAllByRole('button');
    fireEvent.press(buttons[1]);
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('shows hint text', async () => {
    const r = await render(<ThemePicker />);
    expect(r.getByText('Tap to apply · Long-press to preview')).toBeTruthy();
  });
});
