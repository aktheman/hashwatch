import { useGroupSharingStore } from '../src/store/groupSharing';

const mockShareGroup = jest.fn();
const mockListSharedWithMe = jest.fn();
const mockListSharedByMe = jest.fn();
const mockUpdateShareAccess = jest.fn();
const mockRevokeShare = jest.fn();

jest.mock('../src/api/client', () => ({
  shareGroup: (...args: unknown[]) => mockShareGroup(...args),
  listSharedWithMe: (...args: unknown[]) => mockListSharedWithMe(...args),
  listSharedByMe: (...args: unknown[]) => mockListSharedByMe(...args),
  updateShareAccess: (...args: unknown[]) => mockUpdateShareAccess(...args),
  revokeShare: (...args: unknown[]) => mockRevokeShare(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useGroupSharingStore.setState({ sharedWithMe: [], sharedByMe: [], loading: false });
});

describe('useGroupSharingStore', () => {
  it('has initial state', () => {
    const state = useGroupSharingStore.getState();
    expect(state.sharedWithMe).toEqual([]);
    expect(state.sharedByMe).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it('shareGroup calls API and reloads', async () => {
    mockShareGroup.mockResolvedValueOnce({ id: 1, accessLevel: 'view' });
    mockListSharedWithMe.mockResolvedValueOnce([]);
    mockListSharedByMe.mockResolvedValueOnce([
      {
        id: 1,
        groupId: 'Garage',
        accessLevel: 'view',
        sharedWithEmail: 'a@b.com',
        createdAt: '2026-01-01',
      },
    ]);

    await useGroupSharingStore.getState().shareGroup('Garage', 'a@b.com', 'view');

    expect(mockShareGroup).toHaveBeenCalledWith('Garage', 'a@b.com', 'view');
    expect(useGroupSharingStore.getState().sharedByMe).toHaveLength(1);
  });

  it('loadShared loads both lists', async () => {
    mockListSharedWithMe.mockResolvedValueOnce([
      {
        id: 2,
        groupId: 'Basement',
        accessLevel: 'edit',
        sharedWithEmail: 'me@b.com',
        createdAt: '2026-01-02',
      },
    ]);
    mockListSharedByMe.mockResolvedValueOnce([]);

    await useGroupSharingStore.getState().loadShared();

    expect(useGroupSharingStore.getState().sharedWithMe).toHaveLength(1);
    expect(useGroupSharingStore.getState().sharedByMe).toHaveLength(0);
  });

  it('loadShared handles API errors gracefully', async () => {
    mockListSharedWithMe.mockRejectedValueOnce(new Error('network'));
    mockListSharedByMe.mockRejectedValueOnce(new Error('network'));

    await useGroupSharingStore.getState().loadShared();

    expect(useGroupSharingStore.getState().sharedWithMe).toEqual([]);
    expect(useGroupSharingStore.getState().sharedByMe).toEqual([]);
  });

  it('revokeShare calls API and reloads', async () => {
    mockRevokeShare.mockResolvedValueOnce({ deleted: true });
    mockListSharedWithMe.mockResolvedValueOnce([]);
    mockListSharedByMe.mockResolvedValueOnce([]);

    await useGroupSharingStore.getState().revokeShare(42);

    expect(mockRevokeShare).toHaveBeenCalledWith(42);
  });

  it('updateAccess calls API and reloads', async () => {
    mockUpdateShareAccess.mockResolvedValueOnce({ id: 1, accessLevel: 'edit' });
    mockListSharedWithMe.mockResolvedValueOnce([]);
    mockListSharedByMe.mockResolvedValueOnce([]);

    await useGroupSharingStore.getState().updateAccess(1, 'edit');

    expect(mockUpdateShareAccess).toHaveBeenCalledWith(1, 'edit');
  });

  it('sets loading state during loadShared', async () => {
    let resolveShared: (v: unknown[]) => void;
    mockListSharedWithMe.mockReturnValueOnce(
      new Promise((r) => {
        resolveShared = r;
      }),
    );
    mockListSharedByMe.mockResolvedValueOnce([]);

    const p = useGroupSharingStore.getState().loadShared();
    expect(useGroupSharingStore.getState().loading).toBe(true);

    resolveShared!([]);
    await p;
    expect(useGroupSharingStore.getState().loading).toBe(false);
  });
});
