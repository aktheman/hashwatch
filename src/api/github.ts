export interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  contributions: number;
  html_url: string;
  type?: string;
}

export interface RepoStats {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count: number;
}

const REPO_OWNER = 'aktheman';
const REPO_NAME = 'hashwatch';
const API_BASE = 'https://api.github.com';

export async function fetchContributors(): Promise<Contributor[]> {
  const res = await fetch(
    `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    },
  );
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = (await res.json()) as Contributor[];
  return data.filter((c) => c.type !== 'Bot');
}

export async function fetchRepoStats(): Promise<RepoStats> {
  const res = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = (await res.json()) as RepoStats;
  return data;
}

export function getContributorRank(index: number): { badge: string; color: string } {
  if (index === 0) return { badge: '🥇', color: '#FFD700' };
  if (index === 1) return { badge: '🥈', color: '#C0C0C0' };
  if (index === 2) return { badge: '🥉', color: '#CD7F32' };
  return { badge: '', color: 'transparent' };
}
