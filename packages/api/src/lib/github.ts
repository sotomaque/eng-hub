export interface ContributorCommitData {
  username: string;
  totalCommits: number;
  additions: number;
  deletions: number;
  weeklyData: {
    week: number;
    additions: number;
    deletions: number;
    commits: number;
  }[];
}

export interface ReviewData {
  login: string;
  createdAt: string;
}

export interface PRData {
  author: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  merged: boolean;
  mergedAt: string | null;
  createdAt: string;
  reviews: ReviewData[];
}

export interface ContributorAggregated {
  githubUsername: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  reviewsDone: number;
  additions: number;
  deletions: number;
  avgWeeklyCommits: number;
  recentWeeklyCommits: number;
  trend: "up" | "down" | "stable";
  avgWeeklyReviews: number;
  recentWeeklyReviews: number;
  reviewTrend: "up" | "down" | "stable";
}

export function parseGitHubUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0]!, repo: parts[1]!.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "eng-hub",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCommitStats(
  owner: string,
  repo: string,
  token?: string,
): Promise<ContributorCommitData[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors`;
  const headers = buildHeaders(token);

  let response = await fetch(url, { headers });

  // GitHub returns 202 when stats are being computed — retry after delay
  if (response.status === 202) {
    await sleep(3000);
    response = await fetch(url, { headers });
  }

  if (!response.ok) {
    if (response.status === 202) {
      // Still computing — return empty, will populate on next sync
      return [];
    }
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Array<{
    author: { login: string } | null;
    total: number;
    weeks: { w: number; a: number; d: number; c: number }[];
  }>;

  if (!Array.isArray(data)) return [];

  return data
    .filter((c) => c.author?.login)
    .map((c) => ({
      username: c.author!.login,
      totalCommits: c.total,
      additions: c.weeks.reduce((sum, w) => sum + w.a, 0),
      deletions: c.weeks.reduce((sum, w) => sum + w.d, 0),
      weeklyData: c.weeks.map((w) => ({
        week: w.w,
        additions: w.a,
        deletions: w.d,
        commits: w.c,
      })),
    }));
}

const PR_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        author { login }
        state
        merged
        mergedAt
        createdAt
        reviews(first: 50) {
          nodes {
            author { login }
            createdAt
          }
        }
      }
    }
  }
}
`;

export async function fetchPRStats(
  owner: string,
  repo: string,
  token?: string,
): Promise<PRData[]> {
  if (!token) {
    // GraphQL API requires authentication
    return [];
  }

  const allPRs: PRData[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "eng-hub",
      },
      body: JSON.stringify({
        query: PR_QUERY,
        variables: { owner, repo, cursor },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub GraphQL error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      data?: {
        repository?: {
          pullRequests: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
            nodes: Array<{
              author: { login: string } | null;
              state: string;
              merged: boolean;
              mergedAt: string | null;
              createdAt: string;
              reviews: {
                nodes: Array<{
                  author: { login: string } | null;
                  createdAt: string;
                }>;
              };
            }>;
          };
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(`GitHub GraphQL: ${json.errors[0]!.message}`);
    }

    const prs = json.data?.repository?.pullRequests;
    if (!prs) break;

    for (const pr of prs.nodes) {
      if (!pr.author?.login) continue;
      allPRs.push({
        author: pr.author.login,
        state: pr.state as PRData["state"],
        merged: pr.merged,
        mergedAt: pr.mergedAt,
        createdAt: pr.createdAt,
        reviews: pr.reviews.nodes
          .filter(
            (r): r is typeof r & { author: { login: string } } =>
              !!r.author?.login,
          )
          .map((r) => ({ login: r.author.login, createdAt: r.createdAt })),
      });
    }

    hasNextPage = prs.pageInfo.hasNextPage;
    cursor = prs.pageInfo.endCursor;
  }

  return allPRs;
}

function computeTrend(avg: number, recent: number): "up" | "down" | "stable" {
  if (avg === 0) return recent > 0 ? "up" : "stable";
  if (recent >= avg * 1.2) return "up";
  if (recent <= avg * 0.8) return "down";
  return "stable";
}

export function aggregateStats(
  commits: ContributorCommitData[],
  prs: PRData[],
  teamUsernames: Set<string>,
): { allTime: ContributorAggregated[]; ytd: ContributorAggregated[] } {
  const currentYear = new Date().getFullYear();
  const ytdStart = new Date(currentYear, 0, 1);

  // Build all-time stats from commits
  const allTimeMap = new Map<string, ContributorAggregated>();
  const ytdMap = new Map<string, ContributorAggregated>();

  // Track weekly review counts per contributor: username -> (weekTimestamp -> count)
  const allTimeReviewWeeks = new Map<string, Map<number, number>>();
  const ytdReviewWeeks = new Map<string, Map<number, number>>();

  function getOrCreate(
    map: Map<string, ContributorAggregated>,
    username: string,
  ) {
    let entry = map.get(username);
    if (!entry) {
      entry = {
        githubUsername: username,
        commits: 0,
        prsOpened: 0,
        prsMerged: 0,
        reviewsDone: 0,
        additions: 0,
        deletions: 0,
        avgWeeklyCommits: 0,
        recentWeeklyCommits: 0,
        trend: "stable",
        avgWeeklyReviews: 0,
        recentWeeklyReviews: 0,
        reviewTrend: "stable",
      };
      map.set(username, entry);
    }
    return entry;
  }

  const RECENT_WEEKS = 8;

  // Helper: get the Monday-based week timestamp for a date
  function weekOf(date: Date): number {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Start of week (Sunday)
    return d.getTime();
  }

  // Process commit data
  for (const c of commits) {
    if (!teamUsernames.has(c.username)) continue;

    const allTime = getOrCreate(allTimeMap, c.username);
    allTime.commits = c.totalCommits;
    allTime.additions = c.additions;
    allTime.deletions = c.deletions;

    // All-time trend: compare last 8 weeks to overall average
    const totalWeeks = c.weeklyData.length;
    if (totalWeeks > 0) {
      allTime.avgWeeklyCommits = c.totalCommits / totalWeeks;
      const recentSlice = c.weeklyData.slice(-RECENT_WEEKS);
      const recentTotal = recentSlice.reduce((s, w) => s + w.commits, 0);
      allTime.recentWeeklyCommits = recentTotal / recentSlice.length;
      allTime.trend = computeTrend(
        allTime.avgWeeklyCommits,
        allTime.recentWeeklyCommits,
      );
    }

    // YTD: filter weekly data to current year
    const ytdEntry = getOrCreate(ytdMap, c.username);
    const ytdWeeks: typeof c.weeklyData = [];
    for (const w of c.weeklyData) {
      const weekDate = new Date(w.week * 1000);
      if (weekDate >= ytdStart) {
        ytdEntry.commits += w.commits;
        ytdEntry.additions += w.additions;
        ytdEntry.deletions += w.deletions;
        ytdWeeks.push(w);
      }
    }

    // YTD trend
    if (ytdWeeks.length > 0) {
      ytdEntry.avgWeeklyCommits = ytdEntry.commits / ytdWeeks.length;
      const recentYtdSlice = ytdWeeks.slice(-RECENT_WEEKS);
      const recentYtdTotal = recentYtdSlice.reduce((s, w) => s + w.commits, 0);
      ytdEntry.recentWeeklyCommits = recentYtdTotal / recentYtdSlice.length;
      ytdEntry.trend = computeTrend(
        ytdEntry.avgWeeklyCommits,
        ytdEntry.recentWeeklyCommits,
      );
    }
  }

  // Process PR data
  for (const pr of prs) {
    if (teamUsernames.has(pr.author)) {
      const allTime = getOrCreate(allTimeMap, pr.author);
      allTime.prsOpened++;
      if (pr.merged) allTime.prsMerged++;

      const prDate = new Date(pr.createdAt);
      if (prDate >= ytdStart) {
        const ytdEntry = getOrCreate(ytdMap, pr.author);
        ytdEntry.prsOpened++;
        if (pr.merged) ytdEntry.prsMerged++;
      }
    }

    // Count reviews (dedupe per reviewer per PR)
    const seen = new Set<string>();
    for (const review of pr.reviews) {
      if (!teamUsernames.has(review.login)) continue;
      if (seen.has(review.login)) continue;
      seen.add(review.login);

      const allTime = getOrCreate(allTimeMap, review.login);
      allTime.reviewsDone++;

      const reviewDate = new Date(review.createdAt);
      const wk = weekOf(reviewDate);

      // Track weekly reviews for all-time
      let weeks = allTimeReviewWeeks.get(review.login);
      if (!weeks) {
        weeks = new Map();
        allTimeReviewWeeks.set(review.login, weeks);
      }
      weeks.set(wk, (weeks.get(wk) ?? 0) + 1);

      if (reviewDate >= ytdStart) {
        const ytdEntry = getOrCreate(ytdMap, review.login);
        ytdEntry.reviewsDone++;

        let ytdWks = ytdReviewWeeks.get(review.login);
        if (!ytdWks) {
          ytdWks = new Map();
          ytdReviewWeeks.set(review.login, ytdWks);
        }
        ytdWks.set(wk, (ytdWks.get(wk) ?? 0) + 1);
      }
    }
  }

  // Compute review trends
  function computeReviewTrends(
    map: Map<string, ContributorAggregated>,
    weeklyMap: Map<string, Map<number, number>>,
  ) {
    for (const [username, entry] of map) {
      const weeks = weeklyMap.get(username);
      if (!weeks || weeks.size === 0) continue;

      const sortedWeeks = [...weeks.entries()].sort((a, b) => a[0] - b[0]);
      const totalReviews = sortedWeeks.reduce((s, [, count]) => s + count, 0);
      entry.avgWeeklyReviews = totalReviews / sortedWeeks.length;

      const recentSlice = sortedWeeks.slice(-RECENT_WEEKS);
      const recentTotal = recentSlice.reduce((s, [, count]) => s + count, 0);
      entry.recentWeeklyReviews = recentTotal / recentSlice.length;

      entry.reviewTrend = computeTrend(
        entry.avgWeeklyReviews,
        entry.recentWeeklyReviews,
      );
    }
  }

  computeReviewTrends(allTimeMap, allTimeReviewWeeks);
  computeReviewTrends(ytdMap, ytdReviewWeeks);

  return {
    allTime: Array.from(allTimeMap.values()),
    ytd: Array.from(ytdMap.values()),
  };
}
