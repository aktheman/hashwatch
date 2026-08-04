jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

describe('teamExport', () => {
  const baseData = {
    team: {
      id: 't1',
      name: 'Ops Team',
      memberCount: 3,
      role: 'admin',
      createdAt: 1700000000000,
    },
    members: [
      { memberId: 'u1', role: 'admin', email: 'a@x.com', joinedAt: 1700000000000 },
      { memberId: 'u2', role: 'viewer' },
    ],
    minerCount: 2,
    minerNames: ['Miner A', 'Miner B'],
    generatedAt: 1700001000000,
  };

  describe('exportTeamCSV', () => {
    it('includes team summary rows', async () => {
      const { exportTeamCSV } = await import('../src/utils/teamExport');
      const csv = exportTeamCSV(baseData);
      expect(csv).toContain('Team Analytics Report');
      expect(csv).toContain('Ops Team');
      expect(csv).toContain('admin');
      expect(csv).toContain('Miner Count,2');
    });

    it('lists members with roles', async () => {
      const { exportTeamCSV } = await import('../src/utils/teamExport');
      const csv = exportTeamCSV(baseData);
      expect(csv).toContain('u1,admin,a@x.com');
      expect(csv).toContain('u2,viewer');
    });

    it('lists miner names', async () => {
      const { exportTeamCSV } = await import('../src/utils/teamExport');
      const csv = exportTeamCSV(baseData);
      expect(csv).toContain('Miners,Miner A,Miner B');
    });

    it('escapes commas and quotes in values', async () => {
      const { exportTeamCSV } = await import('../src/utils/teamExport');
      const csv = exportTeamCSV({
        ...baseData,
        team: { ...baseData.team, name: 'Ops, "Core" Team' },
        minerNames: ['A, B'],
      });
      expect(csv).toContain('"Ops, ""Core"" Team"');
      expect(csv).toContain('"A, B"');
    });
  });

  describe('buildTeamReportHTML', () => {
    it('renders team name, member table and miner list', async () => {
      const { buildTeamReportHTML } = await import('../src/utils/teamExport');
      const html = buildTeamReportHTML(baseData);
      expect(html).toContain('<h1>Ops Team</h1>');
      expect(html).toContain('>admin<');
      expect(html).toContain('<th>Member ID</th>');
      expect(html).toContain('Miner A');
      expect(html).toContain('Members');
    });

    it('shows a placeholder when no miners are assigned', async () => {
      const { buildTeamReportHTML } = await import('../src/utils/teamExport');
      const html = buildTeamReportHTML({ ...baseData, minerNames: [] });
      expect(html).toContain('No miners assigned to this team yet.');
    });

    it('escapes HTML in team names', async () => {
      const { buildTeamReportHTML } = await import('../src/utils/teamExport');
      const html = buildTeamReportHTML({
        ...baseData,
        team: { ...baseData.team, name: '<script>alert(1)</script>' },
      });
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert(1)</script>');
    });
  });

  describe('generateTeamReport', () => {
    it('returns a blob + html on web', async () => {
      const { generateTeamReport } = await import('../src/utils/teamExport');
      const result = await generateTeamReport(baseData);
      expect(result.blob).toBeDefined();
      expect(result.html).toContain('Ops Team');
      expect(result.uri).toBeUndefined();
    });
  });
});
