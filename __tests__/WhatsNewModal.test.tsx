import { render, screen, waitFor } from '@testing-library/react-native';
import { WhatsNewModal } from '../src/components/WhatsNewModal';

const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  getSetting: (k: string) => mockGetSetting(k),
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WhatsNewModal', () => {
  it('shows modal when version differs', async () => {
    mockGetSetting.mockResolvedValue('1.0.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(screen.getByText("What's New")).toBeTruthy();
    });
  });

  it('shows modal when no version stored yet', async () => {
    mockGetSetting.mockResolvedValue(null);

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(screen.getByText("What's New")).toBeTruthy();
    });
  });

  it('hides modal when version matches', async () => {
    mockGetSetting.mockResolvedValue('1.1.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(screen.queryByText("What's New")).toBeNull();
    });
  });

  it('calls setSetting with current version when shown', async () => {
    mockGetSetting.mockResolvedValue('1.0.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(mockSetSetting).toHaveBeenCalledWith('last_seen_version', '1.1.0');
    });
  });

  it('does not call setSetting when version matches', async () => {
    mockGetSetting.mockResolvedValue('1.1.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(mockSetSetting).not.toHaveBeenCalled();
    });
  });

  it('renders version number in the header', async () => {
    mockGetSetting.mockResolvedValue('1.0.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(screen.getByText(/Version 1\.1\.0/)).toBeTruthy();
    });
  });

  it('renders changelog items', async () => {
    mockGetSetting.mockResolvedValue('1.0.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(screen.getByText(/Real-time fast polling/)).toBeTruthy();
      expect(screen.getByText(/Initial release/)).toBeTruthy();
    });
  });

  it('renders "Got it!" button', async () => {
    mockGetSetting.mockResolvedValue('1.0.0');

    await render(<WhatsNewModal />);

    await waitFor(() => {
      expect(screen.getByText('Got it!')).toBeTruthy();
    });
  });
});
