import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { MarketplaceScreen } from '../src/screens/MarketplaceScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
    info: '#06b6d4',
    glow: '#6c63ff33',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { token: 'mock-token' };
    return selector ? selector(state) : state;
  },
}));

const mockFetchListings = jest.fn();
const mockFetchMyListings = jest.fn();
const mockCreateListing = jest.fn();
const mockDeleteListing = jest.fn();

jest.mock('../src/api/client', () => ({
  fetchMarketplaceListings: (...args: any[]) => mockFetchListings(...args),
  fetchMyListings: (...args: any[]) => mockFetchMyListings(...args),
  createMarketplaceListing: (...args: any[]) => mockCreateListing(...args),
  deleteMarketplaceListing: (...args: any[]) => mockDeleteListing(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchListings.mockResolvedValue({ listings: [] });
});

it('renders the screen title', async () => {
  await render(<MarketplaceScreen />);
  expect(screen.getByText('marketplace.title')).toBeTruthy();
});

it('shows empty state when no listings', async () => {
  await render(<MarketplaceScreen />);
  await waitFor(() => {
    expect(screen.getByText('marketplace.noListings')).toBeTruthy();
  });
});

it('shows FAB button for create listing', async () => {
  await render(<MarketplaceScreen />);
  expect(screen.getByLabelText('marketplace.createListing')).toBeTruthy();
});

it('displays listings', async () => {
  mockFetchListings.mockResolvedValue({
    listings: [
      {
        id: 'l1',
        title: 'BitAxe Ultra',
        price: 199,
        currency: 'USD',
        model: 'BitAxe',
        condition: 'good',
        location: 'NYC',
        sellerId: 's1',
        description: 'Like new',
      },
    ],
  });
  await render(<MarketplaceScreen />);
  await waitFor(() => {
    expect(screen.getByText('BitAxe Ultra')).toBeTruthy();
    expect(screen.getByText('USD 199.00')).toBeTruthy();
  });
});

it('opens create modal on FAB press when authenticated', async () => {
  await render(<MarketplaceScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  });
  await waitFor(() => {
    expect(screen.getAllByText('marketplace.newListing').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows My Listings button when token present', async () => {
  await render(<MarketplaceScreen />);
  expect(screen.getByText('marketplace.myListings')).toBeTruthy();
});

it('calls fetchMarketplaceListings on mount', async () => {
  await render(<MarketplaceScreen />);
  expect(mockFetchListings).toHaveBeenCalledWith(1, 20);
});

it('shows condition badge', async () => {
  mockFetchListings.mockResolvedValue({
    listings: [
      {
        id: 'l1',
        title: 'Test',
        price: 100,
        currency: 'USD',
        model: 'M',
        condition: 'like_new',
        location: 'LA',
        sellerId: 's1',
        description: '',
      },
    ],
  });
  await render(<MarketplaceScreen />);
  await waitFor(() => {
    expect(screen.getByText('marketplace.likeNew')).toBeTruthy();
  });
});
