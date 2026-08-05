import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (
    req: Request & { userId?: string; userEmail?: string },
    _res: Response,
    next: NextFunction,
  ) => {
    req.userId = 'u1';
    req.userEmail = 'owner@test.com';
    next();
  },
}));

import { teamRouter } from '../routes/teams';

const app = express();
app.use(express.json());
app.use('/api/teams', teamRouter);

function row(values: Record<string, unknown>) {
  return { rows: [values] };
}

function withDb(sqlFn: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>) {
  mockQuery.mockImplementation(sqlFn);
}

const TS = new Date();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/teams', () => {
  it('creates a team and owner membership', async () => {
    withDb(async (sql) => {
      if (sql.includes('COUNT(*)::int AS count FROM teams')) return row({ count: 0 });
      if (sql.includes('COUNT(*)::int AS count') && sql.includes('team_members tm')) {
        return row({ count: 0 });
      }
      if (sql.includes('INSERT INTO teams')) {
        return row({ id: 'team-1', name: 'Alpha', ownerid: 'u1', createdat: TS });
      }
      if (sql.includes('INSERT INTO team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).post('/api/teams').send({ name: 'Alpha' });

    expect(res.status).toBe(201);
    expect(res.body.team).toEqual({
      id: 'team-1',
      name: 'Alpha',
      ownerId: 'u1',
      createdAt: TS.getTime(),
    });
    expect(res.body.membership).toEqual({
      id: 'team-1:u1',
      teamId: 'team-1',
      userId: 'u1',
      role: 'owner',
      joinedAt: TS.getTime(),
    });
  });

  it('rejects empty team names', async () => {
    const res = await request(app).post('/api/teams').send({ name: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/teams/:id/invite', () => {
  const membershipOwner = row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });

  it('invites a viewer when the caller is an owner', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return membershipOwner;
      }
      if (sql.includes('SELECT u.id') && sql.includes('team_members tm')) return { rows: [] };
      if (sql.includes("status = 'pending'")) return { rows: [] };
      if (sql.includes('COUNT(*)::int AS count FROM team_invitations')) return row({ count: 0 });
      if (sql.includes('INSERT INTO team_invitations')) {
        return row({
          id: 'inv-1',
          teamid: 'team-1',
          email: 'bob@test.com',
          role: 'viewer',
          invitedby: 'u1',
          status: 'pending',
          createdat: TS,
        });
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/teams/team-1/invite')
      .send({ email: 'bob@test.com', role: 'viewer' });

    expect(res.status).toBe(201);
    expect(res.body.invitation).toEqual({
      id: 'inv-1',
      teamId: 'team-1',
      email: 'bob@test.com',
      role: 'viewer',
      invitedBy: 'u1',
      status: 'pending',
      createdAt: TS.getTime(),
    });
  });

  it('returns 409 when the invitee is already a team member', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return membershipOwner;
      }
      if (sql.includes('SELECT u.id') && sql.includes('team_members tm')) {
        return row({ id: 'u2' });
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/teams/team-1/invite')
      .send({ email: 'bob@test.com', role: 'viewer' });

    expect(res.status).toBe(409);
  });

  it('returns 409 when an invitation is already pending', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return membershipOwner;
      }
      if (sql.includes('SELECT u.id') && sql.includes('team_members tm')) return { rows: [] };
      if (sql.includes("status = 'pending'")) return row({ id: 'inv-1' });
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/teams/team-1/invite')
      .send({ email: 'bob@test.com', role: 'viewer' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Invitation already pending for this email');
  });

  it('returns 403 when a viewer tries to invite', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'viewer', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/teams/team-1/invite')
      .send({ email: 'bob@test.com', role: 'viewer' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for an invalid email', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return membershipOwner;
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/teams/team-1/invite')
      .send({ email: 'not-an-email', role: 'viewer' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/teams', () => {
  it('lists the user teams and pending invitations', async () => {
    withDb(async (sql) => {
      if (sql.includes('(SELECT COUNT(*)::int FROM team_members mc')) {
        return row({ id: 'team-1', name: 'Alpha', ownerid: 'u1', createdat: TS, membercount: 1 });
      }
      if (sql.includes('SELECT teamId, userId, role FROM team_members WHERE userId = $1')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner' });
      }
      if (sql.includes('FROM team_invitations') && sql.includes("status = 'pending'")) {
        return row({
          id: 'inv-1',
          teamid: 'team-1',
          email: 'owner@test.com',
          role: 'viewer',
          invitedby: 'u2',
          status: 'pending',
          createdat: TS,
        });
      }
      return { rows: [] };
    });

    const res = await request(app).get('/api/teams');

    expect(res.status).toBe(200);
    expect(res.body.teams).toEqual([
      {
        id: 'team-1',
        name: 'Alpha',
        ownerId: 'u1',
        memberCount: 1,
        role: 'owner',
        createdAt: TS.getTime(),
      },
    ]);
    expect(res.body.invitations).toHaveLength(1);
  });
});

describe('DELETE /api/teams/:id/leave', () => {
  it('prevents owners from leaving', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).delete('/api/teams/team-1/leave');
    expect(res.status).toBe(400);
  });

  it('lets a member leave', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'viewer', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).delete('/api/teams/team-1/leave');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/teams/:id/miners', () => {
  it('lists shared miners for a member', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      if (sql.includes('SELECT userId FROM team_members')) {
        return { rows: [{ userid: 'u1' }, { userid: 'u2' }] };
      }
      if (sql.includes('JOIN miners m')) {
        return { rows: [{ id: 'm1', name: 'Worker', ip: '10.0.0.5', ownerId: 'u1' }] };
      }
      return { rows: [] };
    });

    const res = await request(app).get('/api/teams/team-1/miners');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      miners: [{ id: 'm1', name: 'Worker', ip: '10.0.0.5', ownerId: 'u1' }],
      memberIds: ['u1', 'u2'],
    });
  });

  it('returns 404 when the user is not a member', async () => {
    withDb(async () => ({ rows: [] }));

    const res = await request(app).get('/api/teams/team-1/miners');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/teams/:id/miners', () => {
  it('shares an owned miner with the team', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      if (sql.includes('SELECT id FROM miners')) return row({ id: 'm1' });
      return { rows: [], rowCount: 1 };
    });

    const res = await request(app).post('/api/teams/team-1/miners').send({ minerId: 'm1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 403 when a viewer tries to share', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'viewer', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).post('/api/teams/team-1/miners').send({ minerId: 'm1' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when the miner is not owned by the user', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).post('/api/teams/team-1/miners').send({ minerId: 'm1' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when minerId is missing', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).post('/api/teams/team-1/miners').send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/teams/:id/miners/:minerId', () => {
  it('unshares a miner as owner', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'owner', joinedat: TS });
      }
      return { rows: [], rowCount: 1 };
    });

    const res = await request(app).delete('/api/teams/team-1/miners/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 403 when a viewer tries to unshare', async () => {
    withDb(async (sql) => {
      if (sql.includes('SELECT teamId, userId, role, joinedAt FROM team_members')) {
        return row({ teamid: 'team-1', userid: 'u1', role: 'viewer', joinedat: TS });
      }
      return { rows: [] };
    });

    const res = await request(app).delete('/api/teams/team-1/miners/m1');

    expect(res.status).toBe(403);
  });
});
