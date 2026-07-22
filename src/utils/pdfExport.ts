import { Platform } from 'react-native';
import { MinerSnapshot, Miner } from '../types';

interface ReportData {
  miner: Miner;
  snapshots: MinerSnapshot[];
  poolBreakdown: Record<string, number>;
}

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GH/s';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' MH/s';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + ' KH/s';
  return n.toFixed(1) + ' H/s';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHashrateChartSVG(data: number[]): string {
  if (data.length === 0) return '';
  const max = Math.max(...data, 1);
  const w = 400;
  const h = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${points.join(' ')}" fill="none" stroke="#3B82F6" stroke-width="2"/>
    <polyline points="0,${h} ${points.join(' ')} ${w},${h}" fill="rgba(59,130,246,0.1)" stroke="none"/>
  </svg>`;
}

function buildPoolPieChartSVG(breakdown: Record<string, number>): string {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return '';
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return '';
  const cx = 75;
  const cy = 75;
  const r = 60;
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  let cumAngle = -Math.PI / 2;
  const paths: string[] = [];

  entries.forEach(([_label, value], i) => {
    const angle = (value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    paths.push(
      `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" opacity="0.85"/>`,
    );
    cumAngle += angle;
  });

  entries.forEach(([, value], i) => {
    const pct = Math.round((value / total) * 100);
    paths.push(
      `<text x="${cx + r + 10}" y="${18 + i * 18}" fill="${colors[i % colors.length]}" font-size="11" font-family="sans-serif">${entries[i][0]} ${pct}%</text>`,
    );
  });

  return `<svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">${paths.join('\n')}</svg>`;
}

function generateHTML(data: ReportData, startDate: string, endDate: string): string {
  const { miner, snapshots, poolBreakdown } = data;

  const hashrates = snapshots.map((s) => s.hashRate).filter((h) => h > 0);
  const temps = snapshots.map((s) => s.temperature).filter((t) => t > 0);
  const uptimes = snapshots.map((s) => s.uptimeSeconds);
  const powers = snapshots.map((s) => s.power).filter((p) => p > 0);
  const sharesAccepted = snapshots.reduce((s, sn) => s + sn.sharesAccepted, 0);
  const sharesRejected = snapshots.reduce((s, sn) => s + sn.sharesRejected, 0);

  const avgHashrate =
    hashrates.length > 0 ? hashrates.reduce((a, b) => a + b, 0) / hashrates.length : 0;
  const peakHashrate = hashrates.length > 0 ? Math.max(...hashrates) : 0;
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
  const totalUptime = uptimes.reduce((a, b) => a + b, 0);
  const avgPower = powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0;
  const efficiency = avgPower > 0 && avgHashrate > 0 ? avgPower / (avgHashrate / 1e9) : 0;

  const chartData = hashrates.slice(-100);
  const chartSVG = buildHashrateChartSVG(chartData);
  const pieSVG = buildPoolPieChartSVG(poolBreakdown);

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
  .chart { margin: 16px 0; text-align: center; }
  .recs { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 16px; }
  .recs h3 { margin: 0 0 8px; font-size: 14px; color: #166534; }
  .recs ul { margin: 0; padding-left: 18px; color: #15803d; font-size: 13px; }
  .footer { text-align: center; color: #999; font-size: 11px; margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">HashWatch</div>
    <h1>${escapeHtml(miner.name)}</h1>
    <div class="subtitle">${escapeHtml(miner.ip)} · ${startDate} to ${endDate} · Generated ${new Date().toLocaleDateString()}</div>
  </div>

  <h2>Statistics Summary</h2>
  <div class="stats">
    <div class="stat"><div class="stat-value">${formatNumber(avgHashrate)}</div><div class="stat-label">Avg Hashrate</div></div>
    <div class="stat"><div class="stat-value">${formatNumber(peakHashrate)}</div><div class="stat-label">Peak Hashrate</div></div>
    <div class="stat"><div class="stat-value">${avgTemp.toFixed(1)}°C</div><div class="stat-label">Avg Temperature</div></div>
    <div class="stat"><div class="stat-value">${Math.round(totalUptime / 3600)}h</div><div class="stat-label">Total Uptime</div></div>
    <div class="stat"><div class="stat-value">${sharesAccepted.toLocaleString()}</div><div class="stat-label">Shares Accepted</div></div>
    <div class="stat"><div class="stat-value">${sharesRejected.toLocaleString()}</div><div class="stat-label">Shares Rejected</div></div>
    <div class="stat"><div class="stat-value">${avgPower.toFixed(1)}W</div><div class="stat-label">Avg Power</div></div>
    <div class="stat"><div class="stat-value">${efficiency > 0 ? efficiency.toFixed(2) + ' J/TH' : 'N/A'}</div><div class="stat-label">Efficiency</div></div>
    <div class="stat"><div class="stat-value">${snapshots.length}</div><div class="stat-label">Snapshots</div></div>
  </div>

  <h2>Hashrate History</h2>
  <div class="chart">${chartSVG || '<p style="color:#999">Not enough data for chart</p>'}</div>

  <h2>Pool Breakdown</h2>
  <div class="chart">${pieSVG || '<p style="color:#999">No pool data</p>'}</div>

  <h2>Recommendations</h2>
  <div class="recs">
    <h3>System Recommendations</h3>
    <ul>
      ${avgTemp > 70 ? '<li>Temperature is above 70°C — consider improving cooling</li>' : ''}
      ${avgTemp > 60 && avgTemp <= 70 ? '<li>Temperature is moderate — monitor for trends</li>' : ''}
      ${avgHashrate > 0 && peakHashrate > 0 && avgHashrate < peakHashrate * 0.8 ? '<li>Hashrate significantly below peak — check for throttling</li>' : ''}
      ${sharesRejected > 0 && sharesAccepted > 0 && (sharesRejected / (sharesAccepted + sharesRejected)) * 100 > 5 ? '<li>High share rejection rate — check pool connection and overclock</li>' : ''}
      ${totalUptime > 86400 ? '<li>Long uptime detected — consider scheduled reboots for stability</li>' : ''}
      ${avgTemp <= 60 && avgHashrate >= peakHashrate * 0.8 ? '<li>System is performing well — no immediate action needed</li>' : ''}
      ${efficiency > 0 && efficiency > 50 ? '<li>Efficiency could be improved — check voltage and frequency settings</li>' : ''}
    </ul>
  </div>

  <div class="footer">
    HashWatch Mining Monitor · Report generated on ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
}

export async function generateMinerReport(
  miner: Miner,
  snapshots: MinerSnapshot[],
  poolData: Record<string, number>,
  startDate: string,
  endDate: string,
): Promise<{ uri?: string; filePath?: string; blob?: Blob; html?: string }> {
  const html = generateHTML({ miner, snapshots, poolBreakdown: poolData }, startDate, endDate);

  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html' });
    return { blob, html };
  }

  try {
    const RNHTMLtoPDF = (await import('react-native-html-to-pdf')).default;
    const result = await RNHTMLtoPDF.convert({
      html,
      fileName: `HashWatch_${miner.name}_${Date.now()}`,
      base64: false,
    });
    return { uri: result.filePath || result.uri, filePath: result.filePath };
  } catch {
    return { html };
  }
}
