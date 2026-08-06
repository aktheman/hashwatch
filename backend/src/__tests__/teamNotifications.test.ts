const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));

const mockSendPush = jest.fn();
jest.mock('../services/pushNotifications', () => ({ sendPushNotification: mockSendPush }));

import {
  sendTeamNotification,
  notifyTeamInvite,
  notifyTeamJoin,
  notifyTeamLeave,
  notifyTeamMinerShared,
  notifyTeamMinerUnshared,
  notifyOwnerMinerShared,
  notifyOwnerMinerUnshared,
  notifySharedMinerMembers,
} from '../services/teamNotifications';

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('sendTeamNotification', () => {
  it('sends a push notification and logs history', async () => {
    await sendTeamNotification('u1', 'team_invite', 'Team Invitation', 'You are invited');

    expect(mockSendPush).toHaveBeenCalledWith(
      'u1',
      'team_invite',
      'Team Invitation',
      'You are invited',
    );
    const insertCall = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO notification_history'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toEqual(
      expect.arrayContaining(['u1', 'Team Invitation', 'You are invited']),
    );
  });

  it('swallows push failures', async () => {
    mockSendPush.mockRejectedValue(new Error('push down'));
    await expect(
      sendTeamNotification('u1', 'team_join', 'New Team Member', 'x joined'),
    ).resolves.toBeUndefined();
  });

  it('swallows history write failures', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    await expect(
      sendTeamNotification('u1', 'team_leave', 'Team Member Left', 'x left'),
    ).resolves.toBeUndefined();
  });
});

describe('team event notifiers', () => {
  it('notifies an invitee', async () => {
    await notifyTeamInvite('u2', 'Alpha', 'owner@test.com');
    expect(mockSendPush).toHaveBeenCalledWith(
      'u2',
      'team_invite',
      'Team Invitation',
      'owner@test.com invited you to join Alpha',
    );
  });

  it('notifies admins of a new member', async () => {
    await notifyTeamJoin(['admin1', 'admin2'], 'Alpha', 'bob@test.com');
    expect(mockSendPush).toHaveBeenCalledWith(
      'admin1',
      'team_join',
      'New Team Member',
      'bob@test.com joined Alpha',
    );
    expect(mockSendPush).toHaveBeenCalledWith(
      'admin2',
      'team_join',
      'New Team Member',
      'bob@test.com joined Alpha',
    );
  });

  it('notifies admins when a member leaves', async () => {
    await notifyTeamLeave(['admin1'], 'Alpha', 'bob@test.com');
    expect(mockSendPush).toHaveBeenCalledWith(
      'admin1',
      'team_leave',
      'Team Member Left',
      'bob@test.com left Alpha',
    );
  });

  it('skips empty ids when notifying a list', async () => {
    await notifyTeamJoin(['', 'admin1'], 'Alpha', 'bob@test.com');
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledWith(
      'admin1',
      'team_join',
      'New Team Member',
      'bob@test.com joined Alpha',
    );
  });

  it('notifies team members about a shared miner', async () => {
    await notifyTeamMinerShared(['m1', 'm2'], 'Alpha', 'Worker');
    expect(mockSendPush).toHaveBeenCalledWith(
      'm1',
      'miner_shared',
      'Miner Shared',
      'Worker was shared with Alpha',
    );
    expect(mockSendPush).toHaveBeenCalledWith(
      'm2',
      'miner_shared',
      'Miner Shared',
      'Worker was shared with Alpha',
    );
  });

  it('notifies team members when a miner is removed', async () => {
    await notifyTeamMinerUnshared(['m1'], 'Alpha', 'Worker');
    expect(mockSendPush).toHaveBeenCalledWith(
      'm1',
      'miner_unshared',
      'Miner Removed',
      'Worker was removed from Alpha',
    );
  });

  it('notifies the owner when their miner is shared', async () => {
    await notifyOwnerMinerShared('owner1', 'Alpha', 'Worker');
    expect(mockSendPush).toHaveBeenCalledWith(
      'owner1',
      'miner_shared',
      'Miner Shared with Team',
      'Your miner Worker was shared with Alpha',
    );
  });

  it('notifies the owner when their miner is removed', async () => {
    await notifyOwnerMinerUnshared('owner1', 'Alpha', 'Worker');
    expect(mockSendPush).toHaveBeenCalledWith(
      'owner1',
      'miner_unshared',
      'Miner Removed from Team',
      'Your miner Worker was removed from Alpha',
    );
  });
});

describe('notifySharedMinerMembers', () => {
  it('notifies all team members except the owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ userid: 'tm1' }, { userid: 'tm2' }] });

    await notifySharedMinerMembers('owner1', 'miner-1', 'offline', 'Miner Offline', 'M is offline');

    const memberQuery = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('FROM team_miners'),
    );
    expect(memberQuery).toBeDefined();
    expect(memberQuery[1]).toEqual(['miner-1', 'owner1']);
    expect(mockSendPush).toHaveBeenCalledWith('tm1', 'offline', 'Miner Offline', 'M is offline');
    expect(mockSendPush).toHaveBeenCalledWith('tm2', 'offline', 'Miner Offline', 'M is offline');
  });

  it('does nothing when the miner has no team members', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await notifySharedMinerMembers('owner1', 'miner-1', 'hot', 'High Temperature', 'M is hot');

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('swallows query failures', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    await expect(
      notifySharedMinerMembers('owner1', 'miner-1', 'offline', 'Miner Offline', 'M is offline'),
    ).resolves.toBeUndefined();
  });
});
