import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemePreviewModal } from '../src/components/ThemePreviewModal';
import { darkTheme } from '../src/theme';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ visible, children }: any) =>
      visible ? R.createElement(R.Fragment, null, children) : null,
  };
});

describe('ThemePreviewModal', () => {
  it('renders when visible', async () => {
    const r = await render(
      <ThemePreviewModal
        visible={true}
        theme={darkTheme}
        themeName="Dark"
        emoji="🌙"
        isActive={false}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(r.getByText('🌙 Dark')).toBeTruthy();
    expect(r.getByText('Apply')).toBeTruthy();
    expect(r.getByText('Close')).toBeTruthy();
  });

  it('returns null when theme is null', async () => {
    const r = await render(
      <ThemePreviewModal
        visible={true}
        theme={null}
        themeName="Test"
        emoji="🎨"
        isActive={false}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(r.toJSON()).toBeNull();
  });

  it('shows Active when isActive is true', async () => {
    const r = await render(
      <ThemePreviewModal
        visible={true}
        theme={darkTheme}
        themeName="Dark"
        emoji="🌙"
        isActive={true}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(r.getByText('Active')).toBeTruthy();
  });

  it('shows color swatches', async () => {
    const r = await render(
      <ThemePreviewModal
        visible={true}
        theme={darkTheme}
        themeName="Dark"
        emoji="🌙"
        isActive={false}
        onApply={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(r.getByText('Primary text')).toBeTruthy();
    expect(r.getByText('Secondary text')).toBeTruthy();
  });
});
