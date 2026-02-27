/**
 * GitHub API client — commit activity and contributor count for repos.
 * Requires GITHUB_TOKEN for higher rate limits. Output: lastCommitDate, commitCount30d, contributorCount.
 * "Dead Repo" = commitCount30d === 0.
 */

import type { GithubActivity } from "@/types/prospect";

const BASE = "https://api.github.com";

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Parse "github.com/owner/repo" or "owner/repo" to owner and repo.
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = url.trim();
    const match = u.match(/github\.com[/]([^/]+)[/]([^/]+?)(?:\.git)?$/i) ?? u.match(/^([^/]+)[/]([^/]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

/**
 * Fetch commit count in last 30 days and repo default branch (for last commit).
 */
export async function fetchRepoActivity(
  owner: string,
  repo: string
): Promise<GithubActivity> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const commitsUrl = `${BASE}/repos/${owner}/${repo}/commits?since=${since}&per_page=100`;
  const contribUrl = `${BASE}/repos/${owner}/${repo}/contributors?per_page=1`;
  const repoUrl = `https://github.com/${owner}/${repo}`;

  const [commitsRes, contribRes] = await Promise.all([
    fetch(commitsUrl, { headers: getHeaders(), next: { revalidate: 3600 } }),
    fetch(contribUrl, { headers: getHeaders(), next: { revalidate: 3600 } }),
  ]);

  let commitCount = 0;
  let lastCommitDate: string | null = null;

  if (commitsRes.ok) {
    const commits = (await commitsRes.json()) as Array<{ commit?: { author?: { date?: string } }; sha?: string }>;
    commitCount = commits.length;
    if (commits[0]?.commit?.author?.date) lastCommitDate = commits[0].commit.author.date;
  }

  let contributorCount = 0;
  if (contribRes.ok) {
    const link = contribRes.headers.get("Link");
    const lastMatch = link?.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    contributorCount = lastMatch ? parseInt(lastMatch[1], 10) : (await contribRes.json()).length;
    if (Number.isNaN(contributorCount) || contributorCount === 0) {
      const arr = (await contribRes.json()) as unknown[];
      contributorCount = arr.length;
    }
  }

  return {
    lastCommitDate,
    commitCount30d: commitCount,
    contributorCount,
    repoUrl,
  };
}

/**
 * Fetch activity for a repo URL (e.g. from DeFiLlama github field or mapping).
 */
export async function fetchActivityForRepoUrl(repoUrl: string): Promise<GithubActivity | null> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return null;
  try {
    return await fetchRepoActivity(parsed.owner, parsed.repo);
  } catch {
    return null;
  }
}

/**
 * Given a protocol slug/name, resolve GitHub repo URL. Uses optional mapping or DeFiLlama github[0].
 * If githubSlug is "owner/repo", use it; if just "owner", assume "owner/owner".
 */
export function resolveRepoFromProtocol(
  _slug: string,
  githubSlug?: string | null
): string | null {
  if (!githubSlug) return null;
  const s = githubSlug.trim();
  if (s.includes("/")) return `https://github.com/${s}`;
  return `https://github.com/${s}/${s}`;
}
