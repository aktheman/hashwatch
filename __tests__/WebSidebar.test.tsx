import React from 'react';
import { Text, Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { WebSidebar } from '../src/components/WebSidebar';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
  }),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: () => ({
    miners: [
      { id: '1', name: 'Miner 1', isOnline: true },
      { id: '2', name: 'Miner 2', isOnline: false },
    ],
  }),
}));

jest.mock('../src/store/subscription', () => ({
  useSubscriptionStore: () => ({
    isPro: true,
  }),
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: () => ({
    email: 'test@example.com',
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('WebSidebar', () => {
  it('renders children on non-web platform', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'ios';
    await render(
      <WebSidebar>
        <Text>Test Content</Text>
      </WebSidebar>,
    );
    expect(screen.getByText('Test Content')).toBeTruthy();
    (Platform as any).OS = originalOS;
  });

  it('renders children on web', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'web';
    const mockAdd = jest.fn();
    const mockRem = jest.fn();
    window.addEventListener = mockAdd;
    window.removeEventListener = mockRem;
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    await render(
      <WebSidebar>
        <Text>Web Content</Text>
      </WebSidebar>,
    );
    expect(screen.getByText('Web Content')).toBeTruthy();
    expect(mockAdd).toHaveBeenCalled();
    (Platform as any).OS = originalOS;
  });
});
