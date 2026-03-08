/**
 * Git-based contributor comparison library.
 *
 * Runs `git log` against a local repo clone and computes per-contributor
 * comparison metrics. Used by the compareContributors tRPC mutation.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";

const COMMIT_DELIMITER = "---COMPARE_DELIM---";

// Files to exclude from focus area analysis
const EXCLUDED_FILE_PATTERNS = [
  "package-lock.json",
  "bun.lock",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".stories.",
  ".test.",
  ".spec.",
];

export type ContributorInput = {
  personId: string;
  name: string;
  emails: string[]; // lowercase: primary email + emailAliases
};

export type ContributorCompareResult = {
  personId: string;
  name: string;
  totalCommits: number;
  allTimeCommits: number;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  additions: number;
  deletions: number;
  netLines: number;
  mrsMerged: number;
  monthlyCommits: Record<string, number>;
  monthlyMRs: Record<string, number>;
  commitTypes: { type: string; count: number }[];
  topFiles: { file: string; count: number }[];
  recentMRs: { branch: string; date: string }[];
};

export type CompareResult = {
  contributors: ContributorCompareResult[];
  months: string[];
};

type ParsedCommit = {
  authorEmail: string;
  date: Date;
  subject: string;
  additions: number;
  deletions: number;
  files: string[];
};

function parseGitLog(rawOutput: string): ParsedCommit[] {
  const commits: ParsedCommit[] = [];
  const blocks = rawOutput.split(COMMIT_DELIMITER).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const authorEmail = lines[0]?.trim();
    const dateStr = lines[1]?.trim();
    const subject = lines[2]?.trim() ?? "";

    if (!authorEmail || !dateStr) continue;

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;

    let additions = 0;
    let deletions = 0;
    const files: string[] = [];

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      const parts = line.split("\t");
      const a = Number.parseInt(parts[0] ?? "", 10);
      const d = Number.parseInt(parts[1] ?? "", 10);
      const file = parts[2] ?? "";
      if (!Number.isNaN(a)) additions += a;
      if (!Number.isNaN(d)) deletions += d;
      if (file) files.push(file);
    }

    commits.push({
      authorEmail: authorEmail.toLowerCase(),
      date,
      subject,
      additions,
      deletions,
      files,
    });
  }

  return commits;
}

function parseCommitType(subject: string): string {
  // Match conventional commit: "type(scope): message" or "type: message"
  const match = subject.match(/^([a-zA-Z]+)(\(.+?\))?:/);
  if (match?.[1]) return match[1].toLowerCase();
  return "other";
}

function toMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isExcludedFile(file: string): boolean {
  return EXCLUDED_FILE_PATTERNS.some((p) => file.includes(p));
}

function buildContributorResult(
  contributor: ContributorInput,
  commits: ParsedCommit[],
): ContributorCompareResult {
  if (commits.length === 0) {
    return {
      personId: contributor.personId,
      name: contributor.name,
      totalCommits: 0,
      allTimeCommits: 0,
      firstCommitDate: null,
      lastCommitDate: null,
      additions: 0,
      deletions: 0,
      netLines: 0,
      mrsMerged: 0,
      monthlyCommits: {},
      monthlyMRs: {},
      commitTypes: [],
      topFiles: [],
      recentMRs: [],
    };
  }

  let additions = 0;
  let deletions = 0;
  const monthlyCommits: Record<string, number> = {};
  const typeCounts = new Map<string, number>();
  const fileCounts = new Map<string, number>();
  let earliest = commits[0]!.date;
  let latest = commits[0]!.date;

  for (const c of commits) {
    additions += c.additions;
    deletions += c.deletions;

    if (c.date < earliest) earliest = c.date;
    if (c.date > latest) latest = c.date;

    const month = toMonthKey(c.date);
    monthlyCommits[month] = (monthlyCommits[month] ?? 0) + 1;

    const ctype = parseCommitType(c.subject);
    typeCounts.set(ctype, (typeCounts.get(ctype) ?? 0) + 1);

    for (const file of c.files) {
      if (!isExcludedFile(file)) {
        fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
      }
    }
  }

  const commitTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const topFiles = Array.from(fileCounts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    personId: contributor.personId,
    name: contributor.name,
    totalCommits: commits.length,
    allTimeCommits: 0, // filled in by all-time counting
    firstCommitDate: earliest.toISOString().slice(0, 10),
    lastCommitDate: latest.toISOString().slice(0, 10),
    additions,
    deletions,
    netLines: additions - deletions,
    mrsMerged: 0, // filled in by MR detection
    monthlyCommits,
    monthlyMRs: {}, // filled in by MR detection
    commitTypes,
    topFiles,
    recentMRs: [], // filled in by MR detection
  };
}

type MRDetectionResult = {
  totalCounts: Map<string, number>;
  monthlyCounts: Map<string, Record<string, number>>;
  recentMRs: Map<string, { branch: string; date: string }[]>;
};

function extractBranchName(mergeSubject: string): string {
  // "Merge branch 'feature-name' into 'development'"
  const match = mergeSubject.match(/Merge branch '([^']+)'/);
  return match?.[1] ?? mergeSubject;
}

function detectMRsForContributors(
  repoPath: string,
  since: string,
  contributors: ContributorInput[],
): MRDetectionResult {
  const totalCounts = new Map<string, number>();
  const monthlyCounts = new Map<string, Record<string, number>>();
  const recentMRs = new Map<string, { branch: string; date: string }[]>();

  // Build email set per contributor for quick lookup
  const emailToPersonId = new Map<string, string>();
  for (const c of contributors) {
    for (const email of c.emails) {
      emailToPersonId.set(email, c.personId);
    }
  }

  let mergeOutput: string;
  try {
    mergeOutput = execSync(
      `git -C "${repoPath}" log --all --merges --since="${since}" --grep="into 'development" --format="%H%n%aI%n%s"`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 },
    ).trim();
  } catch {
    return { totalCounts, monthlyCounts, recentMRs };
  }

  if (!mergeOutput) return { totalCounts, monthlyCounts, recentMRs };

  // Parse merge commits: each has 3 lines (hash, date, subject)
  const lines = mergeOutput.split("\n").filter(Boolean);
  const merges: { hash: string; date: Date; subject: string }[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const hash = lines[i];
    const dateStr = lines[i + 1];
    const subject = lines[i + 2];
    if (!hash || !dateStr || !subject) continue;
    const date = new Date(dateStr);
    if (!Number.isNaN(date.getTime())) {
      merges.push({ hash, date, subject });
    }
  }

  for (const merge of merges) {
    try {
      const branchAuthors = execSync(
        `git -C "${repoPath}" log --format="%ae" "${merge.hash}^1..${merge.hash}^2"`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
      ).trim();

      if (!branchAuthors) continue;

      const month = toMonthKey(merge.date);
      const branch = extractBranchName(merge.subject);
      const dateStr = merge.date.toISOString().slice(0, 10);

      // Dedupe: count each person once per MR
      const seen = new Set<string>();
      for (const email of branchAuthors.split("\n")) {
        const personId = emailToPersonId.get(email.trim().toLowerCase());
        if (personId && !seen.has(personId)) {
          seen.add(personId);
          totalCounts.set(personId, (totalCounts.get(personId) ?? 0) + 1);

          // Monthly
          let monthly = monthlyCounts.get(personId);
          if (!monthly) {
            monthly = {};
            monthlyCounts.set(personId, monthly);
          }
          monthly[month] = (monthly[month] ?? 0) + 1;

          // Recent MRs (keep up to 10 per person)
          let mrs = recentMRs.get(personId);
          if (!mrs) {
            mrs = [];
            recentMRs.set(personId, mrs);
          }
          if (mrs.length < 10) {
            mrs.push({ branch, date: dateStr });
          }
        }
      }
    } catch {}
  }

  return { totalCounts, monthlyCounts, recentMRs };
}

export function expandRepoPath(repoPath: string): string {
  if (repoPath.startsWith("~")) {
    return repoPath.replace("~", os.homedir());
  }
  return repoPath;
}

const DEFAULT_REPO_PATH = "~/Desktop/hypergiant/jeric2o";

export function compareContributors(
  repoPath: string | undefined,
  contributors: ContributorInput[],
  since: string,
): CompareResult {
  const resolved = expandRepoPath(repoPath ?? DEFAULT_REPO_PATH);

  if (!existsSync(resolved)) {
    throw new Error(`Repository not found at: ${resolved}`);
  }

  // Build email → personId lookup for filtering
  const emailToPersonId = new Map<string, string>();
  for (const c of contributors) {
    for (const email of c.emails) {
      emailToPersonId.set(email, c.personId);
    }
  }

  // Single git log pass
  const rawOutput = execSync(
    `git -C "${resolved}" log --all --since="${since}" --format="${COMMIT_DELIMITER}%n%ae%n%aI%n%s" --numstat`,
    { encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 },
  );

  const allCommits = parseGitLog(rawOutput);

  // Group commits by personId
  const commitsByPerson = new Map<string, ParsedCommit[]>();
  for (const c of contributors) {
    commitsByPerson.set(c.personId, []);
  }

  for (const commit of allCommits) {
    const personId = emailToPersonId.get(commit.authorEmail);
    if (personId) {
      commitsByPerson.get(personId)?.push(commit);
    }
  }

  // Build results
  const results: ContributorCompareResult[] = contributors.map((c) =>
    buildContributorResult(c, commitsByPerson.get(c.personId) ?? []),
  );

  // MR detection
  const mrResult = detectMRsForContributors(resolved, since, contributors);
  for (const r of results) {
    r.mrsMerged = mrResult.totalCounts.get(r.personId) ?? 0;
    r.monthlyMRs = mrResult.monthlyCounts.get(r.personId) ?? {};
    r.recentMRs = mrResult.recentMRs.get(r.personId) ?? [];
  }

  // All-time commit counts (separate pass without --since)
  try {
    const allTimeOutput = execSync(
      `git -C "${resolved}" log --all --format="${COMMIT_DELIMITER}%n%ae"`,
      { encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 },
    );
    const allTimeEmails = allTimeOutput
      .split(COMMIT_DELIMITER)
      .filter((b) => b.trim())
      .map((b) => b.trim().split("\n")[0]?.toLowerCase() ?? "");

    for (const email of allTimeEmails) {
      const personId = emailToPersonId.get(email);
      if (personId) {
        const r = results.find((res) => res.personId === personId);
        if (r) r.allTimeCommits += 1;
      }
    }
  } catch {
    // Non-critical — leave allTimeCommits as 0
  }

  // Collect all months across all contributors (commits + MRs), sorted
  const monthSet = new Set<string>();
  for (const r of results) {
    for (const month of Object.keys(r.monthlyCommits)) {
      monthSet.add(month);
    }
    for (const month of Object.keys(r.monthlyMRs)) {
      monthSet.add(month);
    }
  }
  const months = Array.from(monthSet).sort();

  return { contributors: results, months };
}
