import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { MarketplaceScreen } from '../src/screens/MarketplaceScreen';

let mockToken: string | null = 't1';

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = { token: mockToken };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    primary: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    accent: '#3b82f6',
    info: '#06b6d4',
    glow: '#6c63ff33',
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

const listing = {
  id: 'l1',
  title: 'BitAxe Ultra',
  description: 'Great miner',
  price: 199,
  currency: 'USD',
  model: 'Ultra',
  condition: 'like_new',
  location: 'NYC',
  sellerId: 's1',
  createdAt: 1000,
};

function mockAlertButton(buttonText: string) {
  return jest
    .spyOn(Alert, 'alert')
    .mockImplementation(
      (
        _title?: string,
        _msg?: string,
        buttons?: Array<{ text?: string; onPress?: () => void }>,
      ) => {
        const btn = buttons?.find((b) => b.text === buttonText);
        if (btn?.onPress) btn.onPress();
      },
    );
}

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockToken = 't1';
  mockFetchListings.mockReset();
  mockFetchMyListings.mockReset();
  mockCreateListing.mockReset();
  mockDeleteListing.mockReset();
  mockFetchListings.mockResolvedValue({ listings: [], total: 0, page: 1, limit: 20 });
  mockFetchMyListings.mockResolvedValue([]);
  mockCreateListing.mockResolvedValue(listing);
  mockDeleteListing.mockResolvedValue({ deleted: true });
});

afterEach(() => jest.restoreAllMocks());

it('renders the screen title', async () => {
  await render(<MarketplaceScreen />);
  expect(screen.getByText('marketplace.title')).toBeTruthy();
});

it('calls fetchMarketplaceListings on mount', async () => {
  await render(<MarketplaceScreen />);
  expect(mockFetchListings).toHaveBeenCalledWith(1, 20);
});

it('shows empty state when no listings', async () => {
  await render(<MarketplaceScreen />);
  await waitFor(() => {
    expect(screen.getByText('marketplace.noListings')).toBeTruthy();
  });
});

it('renders listing cards with formatted price', async () => {
  mockFetchListings.mockResolvedValue({ listings: [listing], total: 1, page: 1, limit: 20 });
  await render(<MarketplaceScreen />);
  await waitFor(() => {
    expect(screen.getByText('BitAxe Ultra')).toBeTruthy();
    expect(screen.getByText('USD 199.00')).toBeTruthy();
    expect(screen.getByText('📍 NYC')).toBeTruthy();
  });
});

it('shows condition label key', async () => {
  mockFetchListings.mockResolvedValue({
    listings: [{ ...listing, condition: 'good' }],
    total: 1,
    page: 1,
    limit: 20,
  });
  await render(<MarketplaceScreen />);
  await waitFor(() => {
    expect(screen.getByText('marketplace.goodCondition')).toBeTruthy();
  });
});

it('shows My Listings button when authenticated', async () => {
  await render(<MarketplaceScreen />);
  expect(screen.getByLabelText('marketplace.myListings')).toBeTruthy();
});

it('hides My Listings button when logged out', async () => {
  mockToken = null;
  await render(<MarketplaceScreen />);
  expect(screen.queryByLabelText('marketplace.myListings')).toBeNull();
});

it('shows offline alert when FAB pressed while logged out', async () => {
  mockToken = null;
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  expect(alertSpy).toHaveBeenCalledWith('common.error', 'common.offline');
  expect(screen.queryByText('marketplace.newListing')).toBeNull();
  alertSpy.mockRestore();
});

it('opens create modal on FAB press when authenticated', async () => {
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  await waitFor(() => {
    expect(screen.getByLabelText('Currency')).toBeTruthy();
  });
});

it('does not create when required fields are empty', async () => {
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  await waitFor(() => expect(screen.getByLabelText('Currency')).toBeTruthy());
  await fireEvent.press(screen.getByText('marketplace.createListing'));
  expect(mockCreateListing).not.toHaveBeenCalled();
});

it('does not create when price is zero', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  await waitFor(() => expect(screen.getByLabelText('Currency')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('marketplace.newListing'), 'My Miner');
  await fireEvent.changeText(screen.getByLabelText('marketplace.model'), 'Ultra X');
  await fireEvent.changeText(screen.getByLabelText('marketplace.price'), '0');
  await fireEvent.changeText(screen.getByLabelText('marketplace.location'), 'Austin');
  await fireEvent.press(screen.getByText('marketplace.createListing'));
  expect(mockCreateListing).not.toHaveBeenCalled();
  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('creates a new listing successfully', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<MarketplaceScreen />);
  await waitFor(() => expect(screen.getByText('marketplace.noListings')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  await waitFor(() => expect(screen.getByLabelText('Currency')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('marketplace.newListing'), 'My Miner');
  await fireEvent.changeText(screen.getByLabelText('marketplace.model'), 'Ultra X');
  await fireEvent.changeText(screen.getByLabelText('marketplace.price'), '250');
  await fireEvent.changeText(screen.getByLabelText('marketplace.location'), 'Austin');
  await fireEvent.press(screen.getByLabelText('marketplace.fairCondition'));
  await fireEvent.press(screen.getByText('marketplace.createListing'));
  await waitFor(() => {
    expect(mockCreateListing).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Miner',
        model: 'Ultra X',
        price: 250,
        location: 'Austin',
        condition: 'fair',
        currency: 'USD',
      }),
    );
  });
  expect(alertSpy).toHaveBeenCalledWith('common.success', 'marketplace.newListing');
  await waitFor(() => {
    expect(screen.queryByText('marketplace.newListing')).toBeNull();
  });
  expect(mockFetchListings.mock.calls.length).toBeGreaterThanOrEqual(2);
  alertSpy.mockRestore();
});

it('shows error alert when creating fails', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockCreateListing.mockRejectedValue(new Error('fail'));
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.createListing'));
  await waitFor(() => expect(screen.getByLabelText('Currency')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('marketplace.newListing'), 'My Miner');
  await fireEvent.changeText(screen.getByLabelText('marketplace.model'), 'Ultra X');
  await fireEvent.changeText(screen.getByLabelText('marketplace.price'), '250');
  await fireEvent.changeText(screen.getByLabelText('marketplace.location'), 'Austin');
  await fireEvent.press(screen.getByText('marketplace.createListing'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'common.error');
  });
  alertSpy.mockRestore();
});

it('opens detail modal on listing tap', async () => {
  mockFetchListings.mockResolvedValue({ listings: [listing], total: 1, page: 1, limit: 20 });
  await render(<MarketplaceScreen />);
  await waitFor(() => expect(screen.getByText('BitAxe Ultra')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('BitAxe Ultra - 199 USD'));
  await waitFor(() => {
    expect(screen.getByText('Great miner')).toBeTruthy();
    expect(screen.getByText('Ultra')).toBeTruthy();
  });
  expect(screen.getByText('marketplace.contactSeller')).toBeTruthy();
});

it('closes the detail modal', async () => {
  mockFetchListings.mockResolvedValue({ listings: [listing], total: 1, page: 1, limit: 20 });
  await render(<MarketplaceScreen />);
  await waitFor(() => expect(screen.getByText('BitAxe Ultra')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('BitAxe Ultra - 199 USD'));
  await waitFor(() => expect(screen.getByText('Great miner')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('common.close'));
  await waitFor(() => {
    expect(screen.queryByText('Great miner')).toBeNull();
  });
});

it('shows contact seller alert', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockFetchListings.mockResolvedValue({ listings: [listing], total: 1, page: 1, limit: 20 });
  await render(<MarketplaceScreen />);
  await waitFor(() => expect(screen.getByText('BitAxe Ultra')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('BitAxe Ultra - 199 USD'));
  await waitFor(() => expect(screen.getByLabelText('marketplace.contactSeller')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('marketplace.contactSeller'));
  expect(alertSpy).toHaveBeenCalledWith(
    'marketplace.contactSeller',
    'marketplace.contactSeller',
    expect.anything(),
  );
  alertSpy.mockRestore();
});

it('loads more listings when the page is full', async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({
    ...listing,
    id: `l${i}`,
    title: `Miner ${i}`,
    price: 100 + i,
  }));
  mockFetchListings.mockResolvedValue({ listings: many, total: 40, page: 1, limit: 20 });
  await render(<MarketplaceScreen />);
  await waitFor(() => expect(screen.getByText('common.retry')).toBeTruthy());
  await fireEvent.press(screen.getByText('common.retry'));
  await waitFor(() => {
    expect(mockFetchListings.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  expect(mockFetchListings.mock.calls[mockFetchListings.mock.calls.length - 1]).toEqual([2, 20]);
});

it('opens my listings modal', async () => {
  mockFetchMyListings.mockResolvedValue([listing]);
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.myListings'));
  await waitFor(() => {
    expect(screen.getByLabelText('marketplace.deleteListing')).toBeTruthy();
  });
});

it('deletes a listing from my listings', async () => {
  const alertSpy = mockAlertButton('common.delete');
  mockFetchMyListings.mockResolvedValue([listing]);
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.myListings'));
  await waitFor(() => expect(screen.getByLabelText('marketplace.deleteListing')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('marketplace.deleteListing'));
  await waitFor(() => {
    expect(mockDeleteListing).toHaveBeenCalledWith('l1');
  });
  expect(alertSpy).toHaveBeenCalledWith(
    'marketplace.deleteListing',
    'marketplace.deleteListing',
    expect.anything(),
  );
  alertSpy.mockRestore();
});

it('cancels deleting a listing', async () => {
  const alertSpy = mockAlertButton('common.cancel');
  mockFetchMyListings.mockResolvedValue([listing]);
  await render(<MarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.myListings'));
  await waitFor(() => expect(screen.getByLabelText('marketplace.deleteListing')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('marketplace.deleteListing'));
  expect(mockDeleteListing).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});
