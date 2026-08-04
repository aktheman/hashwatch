import { Platform } from 'react-native';

export interface TeamMemberRow {
  memberId: string;
  role: string;
  email?: string;
  joinedAt?: number;
}

export interface TeamReportData {
  team: {
    id: string;
    name: string;
    memberCount: number;
    role: string;
    createdAt: number;
  };
  members: TeamMemberRow[];
  minerCount: number;
  minerNames: string[];
  generatedAt: number;
}

function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(ms: number): string {
  return ms > 0 ? new Date(ms).toLocaleDateString() : 'N/A';
}

export function exportTeamCSV(data: TeamReportData): string {
  const lines: string[] = [];
  lines.push('Team Analytics Report');
  lines.push('');
  lines.push('Team,Name,Created,Member Count,Your Role');
  lines.push(
    [
      data.team.name,
      data.team.name,
      formatDate(data.team.createdAt),
      data.team.memberCount,
      data.team.role,
    ]
      .map(escapeCSV)
      .join(','),
  );
  lines.push('');
  lines.push('Member ID,Role,Email,Joined');
  for (const m of data.members) {
    lines.push(
      [m.memberId, m.role, m.email ?? '', m.joinedAt ? formatDate(m.joinedAt) : '']
        .map(escapeCSV)
        .join(','),
    );
  }
  lines.push('');
  lines.push(`Miner Count,${data.minerCount}`);
  if (data.minerNames.length > 0) {
    lines.push('Miners,' + data.minerNames.map(escapeCSV).join(','));
  }
  lines.push('');
  lines.push(`Generated,${new Date(data.generatedAt).toLocaleString()}`);
  return lines.join('\n');
}

export function buildTeamReportHTML(data: TeamReportData): string {
  const memberRows = data.members
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.memberId)}</td><td>${escapeHtml(m.role)}</td><td>${escapeHtml(
          m.email ?? '',
        )}</td><td>${formatDate(m.joinedAt ?? 0)}</td></tr>`,
    )
    .join('');
  const minerList =
    data.minerNames.length > 0
      ? `<p>${data.minerNames.map(escapeHtml).join(', ')}</p>`
      : '<p>No miners assigned to this team yet.</p>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; color: #555; margin-top: 24px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #3B82F6; }
  .logo { font-size: 28px; font-weight: 900; color: #3B82F6; letter-spacing: -1px; }
  .subtitle { color: #666; font-size: 13px; margin-top: 4px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
  .stat { background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
  .stat-value { font-size: 20px; font-weight: 700; color: #1e293b; }
  .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 13px; }
  th { background: #f1f5f9; }
  .footer { text-align: center; color: #999; font-size: 11px; margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">HashWatch</div>
    <h1>${escapeHtml(data.team.name)}</h1>
    <div class="subtitle">Team Analytics · Generated ${new Date(data.generatedAt).toLocaleString()}</div>
  </div>

  <h2>Team Summary</h2>
  <div class="stats">
    <div class="stat"><div class="stat-value">${data.team.memberCount}</div><div class="stat-label">Members</div></div>
    <div class="stat"><div class="stat-value">${data.minerCount}</div><div class="stat-label">Miners</div></div>
    <div class="stat"><div class="stat-value">${escapeHtml(data.team.role)}</div><div class="stat-label">Your Role</div></div>
  </div>
  <p>Created: ${formatDate(data.team.createdAt)}</p>

  <h2>Members</h2>
  ${
    memberRows
      ? `<table><thead><tr><th>Member ID</th><th>Role</th><th>Email</th><th>Joined</th></tr></thead><tbody>${memberRows}</tbody></table>`
      : '<p>No members listed.</p>'
  }

  <h2>Assigned Miners</h2>
  ${minerList}

  <div class="footer">
    HashWatch Mining Monitor · Team report generated on ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
}

export async function generateTeamReport(
  data: TeamReportData,
): Promise<{ uri?: string; filePath?: string; blob?: Blob; html?: string }> {
  const html = buildTeamReportHTML(data);

  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html' });
    return { blob, html };
  }

  try {
    const RNHTMLtoPDF = (await import('react-native-html-to-pdf')).default;
    const result = await RNHTMLtoPDF.convert({
      html,
      fileName: `HashWatch_Team_${data.team.name.replace(/[^a-zA-Z0-9]+/g, '_')}_${Date.now()}`,
      base64: false,
    });
    return { uri: result.filePath || result.uri, filePath: result.filePath };
  } catch {
    return { html };
  }
}
