import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { SharedGroupsScreen } from '../src/screens/SharedGroupsScreen';

let mockSharedWithMe: any[] = [];
let mockSharedByMe: any[] = [];
let mockLoading = false;
const mockLoadShared = jest.fn();
const mockRevokeShare = jest.fn();
const mockUpdateAccess = jest.fn();

jest.mock('../src/store/groupSharing', () => ({
  useGroupSharingStore: (selector?: any) => {
    const state = {
      sharedWithMe: mockSharedWithMe,
      sharedByMe: mockSharedByMe,
      loading: mockLoading,
      loadShared: mockLoadShared,
      revokeShare: mockRevokeShare,
      updateAccess: mockUpdateAccess,
    };
    return selector ? selector(state) : state;
  },
}));

const mockFetchSharedGroupMiners = jest.fn();

jest.mock('../src/api/client', () => ({
  fetchSharedGroupMiners: (...args: any[]) => mockFetchSharedGroupMiners(...args),
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

const incomingShare = { id: 1, groupId: 'g1', ownerEmail: 'a@b.com', accessLevel: 'view' };
const outgoingShare = { id: 2, groupId: 'g2', sharedWithEmail: 'f@x.com', accessLevel: 'view' };

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockSharedWithMe = [];
  mockSharedByMe = [];
  mockLoading = false;
  mockLoadShared.mockReset();
  mockRevokeShare.mockReset();
  mockUpdateAccess.mockReset();
  mockFetchSharedGroupMiners.mockReset();
  mockLoadShared.mockResolvedValue(undefined);
  mockRevokeShare.mockResolvedValue(undefined);
  mockUpdateAccess.mockResolvedValue(undefined);
  mockFetchSharedGroupMiners.mockResolvedValue({ miners: [] });
});

afterEach(() => jest.restoreAllMocks());

it('renders the screen title and loads shared groups on mount', async () => {
  await render(<SharedGroupsScreen />);
  expect(screen.getByText('groupSharing.title')).toBeTruthy();
  expect(mockLoadShared).toHaveBeenCalledTimes(1);
});

it('shows empty state for both sections', async () => {
  await render(<SharedGroupsScreen />);
  await waitFor(() => {
    expect(screen.getAllByText('groupSharing.noShares')).toHaveLength(2);
  });
});

it('shows loading indicator in the shared-with-me section', async () => {
  mockLoading = true;
  await render(<SharedGroupsScreen />);
  await waitFor(() => {
    expect(screen.getAllByText('groupSharing.noShares')).toHaveLength(1);
  });
  expect(screen.getByText('groupSharing.sharedWithMe')).toBeTruthy();
});

it('renders shared-with-me cards with owner info and actions', async () => {
  mockSharedWithMe = [incomingShare];
  await render(<SharedGroupsScreen />);
  await waitFor(() => {
    expect(screen.getByText('g1')).toBeTruthy();
    expect(screen.getByText('view')).toBeTruthy();
  });
  expect(screen.getByText('groupSharing.sharedByMe: a@b.com')).toBeTruthy();
  expect(screen.getByLabelText('groupSharing.sharedMiners')).toBeTruthy();
  expect(screen.getByLabelText('groupSharing.revoke')).toBeTruthy();
});

it('views the shared miners of a group', async () => {
  mockSharedWithMe = [incomingShare];
  mockFetchSharedGroupMiners.mockResolvedValue({
    miners: [{ id: 'm1', name: 'Miner A', ip: '10.0.0.5' }],
  });
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('g1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.sharedMiners'));
  await waitFor(() => {
    expect(mockFetchSharedGroupMiners).toHaveBeenCalledWith('g1');
  });
  await waitFor(() => {
    expect(screen.getByText('Miner A')).toBeTruthy();
    expect(screen.getByText('10.0.0.5')).toBeTruthy();
    expect(screen.getByText('groupSharing.sharedMiners')).toBeTruthy();
  });
});

it('shows empty miners state when viewing fails', async () => {
  mockSharedWithMe = [incomingShare];
  mockFetchSharedGroupMiners.mockRejectedValue(new Error('boom'));
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('g1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.sharedMiners'));
  await waitFor(() => {
    expect(screen.getByText('groups.noMiners')).toBeTruthy();
  });
});

it('navigates back from the shared miners view', async () => {
  mockSharedWithMe = [incomingShare];
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('g1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.sharedMiners'));
  await waitFor(() => expect(screen.getByText('groups.noMiners')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('common.goBack'));
  await waitFor(() => {
    expect(screen.getByText('g1')).toBeTruthy();
    expect(screen.getByLabelText('groupSharing.sharedMiners')).toBeTruthy();
  });
});

it('revokes a shared-with-me share', async () => {
  mockSharedWithMe = [incomingShare];
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('g1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.revoke'));
  expect(mockRevokeShare).toHaveBeenCalledWith(1);
});

it('renders shared-by-me cards with toggle and revoke actions', async () => {
  mockSharedByMe = [outgoingShare];
  await render(<SharedGroupsScreen />);
  await waitFor(() => {
    expect(screen.getByText('g2')).toBeTruthy();
    expect(screen.getByText('view')).toBeTruthy();
    expect(screen.getByText('f@x.com')).toBeTruthy();
  });
  expect(screen.getByText('groupSharing.edit')).toBeTruthy();
  expect(screen.getByLabelText('groupSharing.accessLevel')).toBeTruthy();
  expect(screen.getByLabelText('groupSharing.revoke')).toBeTruthy();
});

it('toggles access from view to edit', async () => {
  mockSharedByMe = [outgoingShare];
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('g2')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.accessLevel'));
  expect(mockUpdateAccess).toHaveBeenCalledWith(2, 'edit');
});

it('toggles access from edit to view', async () => {
  mockSharedByMe = [{ ...outgoingShare, accessLevel: 'edit' }];
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('groupSharing.view')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.accessLevel'));
  expect(mockUpdateAccess).toHaveBeenCalledWith(2, 'view');
});

it('revokes a shared-by-me share', async () => {
  mockSharedByMe = [outgoingShare];
  await render(<SharedGroupsScreen />);
  await waitFor(() => expect(screen.getByText('g2')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('groupSharing.revoke'));
  expect(mockRevokeShare).toHaveBeenCalledWith(2);
});
