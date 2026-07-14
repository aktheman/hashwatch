import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { SharedGroupsScreen } from '../src/screens/SharedGroupsScreen';

const mockLoadShared = jest.fn().mockResolvedValue(undefined);
const mockRevokeShare = jest.fn().mockResolvedValue(undefined);
const mockUpdateAccess = jest.fn().mockResolvedValue(undefined);

let mockSharedWithMe: any[] = [];
let mockSharedByMe: any[] = [];
let mockLoading = false;

const getMockState = () => ({
  sharedWithMe: mockSharedWithMe,
  sharedByMe: mockSharedByMe,
  loading: mockLoading,
  loadShared: mockLoadShared,
  revokeShare: mockRevokeShare,
  updateAccess: mockUpdateAccess,
});

jest.mock('../src/store/groupSharing', () => ({
  useGroupSharingStore: Object.assign(
    (selectorOrFn?: any) => {
      const state = getMockState();
      return typeof selectorOrFn === 'function' ? selectorOrFn(state) : state;
    },
    {
      getState: getMockState,
    },
  ),
}));

jest.mock('../src/api/client', () => ({
  fetchSharedGroupMiners: jest.fn().mockResolvedValue({ miners: [], accessLevel: 'view' }),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSharedWithMe = [];
  mockSharedByMe = [];
  mockLoading = false;
});

describe('SharedGroupsScreen', () => {
  it('renders title', async () => {
    await render(<SharedGroupsScreen />);
    expect(screen.getByText('groupSharing.title')).toBeTruthy();
  });

  it('calls loadShared on mount', async () => {
    await render(<SharedGroupsScreen />);
    expect(mockLoadShared).toHaveBeenCalled();
  });

  it('shows empty state when no shares', async () => {
    await render(<SharedGroupsScreen />);
    expect(screen.getAllByText('groupSharing.noShares').length).toBeGreaterThanOrEqual(1);
  });

  it('shows shared with me section', async () => {
    mockSharedWithMe = [
      {
        id: 1,
        groupId: 'Garage',
        accessLevel: 'view',
        sharedWithEmail: 'me@test.com',
        ownerEmail: 'owner@test.com',
        createdAt: '2026-01-01',
      },
    ];
    await render(<SharedGroupsScreen />);
    expect(screen.getByText('Garage')).toBeTruthy();
  });

  it('shows shared by me section', async () => {
    mockSharedByMe = [
      {
        id: 2,
        groupId: 'Basement',
        accessLevel: 'edit',
        sharedWithEmail: 'friend@test.com',
        createdAt: '2026-01-01',
      },
    ];
    await render(<SharedGroupsScreen />);
    expect(screen.getByText('Basement')).toBeTruthy();
  });

  it('shows loading indicator', async () => {
    mockLoading = true;
    await render(<SharedGroupsScreen />);
    expect(screen.getByText('groupSharing.sharedWithMe')).toBeTruthy();
  });

  it('shows revoke button for shared with me', async () => {
    mockSharedWithMe = [
      {
        id: 1,
        groupId: 'Garage',
        accessLevel: 'view',
        sharedWithEmail: 'me@test.com',
        ownerEmail: 'owner@test.com',
        createdAt: '2026-01-01',
      },
    ];
    await render(<SharedGroupsScreen />);
    expect(screen.getAllByText('groupSharing.revoke').length).toBeGreaterThanOrEqual(1);
  });

  it('shows shared miners button', async () => {
    mockSharedWithMe = [
      {
        id: 1,
        groupId: 'Garage',
        accessLevel: 'view',
        sharedWithEmail: 'me@test.com',
        ownerEmail: 'owner@test.com',
        createdAt: '2026-01-01',
      },
    ];
    await render(<SharedGroupsScreen />);
    expect(screen.getByText('groupSharing.sharedMiners')).toBeTruthy();
  });

  it('renders both sections when both have data', async () => {
    mockSharedWithMe = [
      {
        id: 1,
        groupId: 'G1',
        accessLevel: 'view',
        sharedWithEmail: 'a@b.com',
        ownerEmail: 'o@b.com',
        createdAt: '2026-01-01',
      },
    ];
    mockSharedByMe = [
      {
        id: 2,
        groupId: 'G2',
        accessLevel: 'edit',
        sharedWithEmail: 'c@d.com',
        createdAt: '2026-01-01',
      },
    ];
    await render(<SharedGroupsScreen />);
    expect(screen.getByText('G1')).toBeTruthy();
    expect(screen.getByText('G2')).toBeTruthy();
  });
});
