/**
 * Syncs contributor stats from a local git repo clone into the database.
 *
 * Usage:
 *   bun run packages/api/src/scripts/sync-git-stats.ts <projectId> <repoPath>
 *
 * Example:
 *   bun run packages/api/src/scripts/sync-git-stats.ts cmlsmp63g0000itbru5wvt294 ~/repos/jeric2o
 *
 * How it works:
 *   1. Runs `git log` on the local repo to extract per-commit data
 *   2. Looks up team members for the project and builds an email → username map
 *   3. Matches commit authors by email to team members
 *   4. Aggregates into all_time + ytd stats using the same logic as GitHub sync
 *   5. Writes results to contributor_stats (full replace)
 */

import { execSync } from "node:child_process";
import { db, type StatsPeriod } from "@workspace/db";
import { aggregateStats, type ContributorCommitData } from "../lib/github";

const COMMIT_DELIMITER = "---COMMIT_DELIM---";

function printUsage(): void {
  console.log(
    "Usage: bun run packages/api/src/scripts/sync-git-stats.ts <projectId> <repoPath> [branch]",
  );
  console.log(
    "Example: bun run packages/api/src/scripts/sync-git-stats.ts cmlsmp63g0000itbru5wvt294 ~/repos/jeric2o development",
  );
}

function parseGitLog(rawOutput: string): {
  authorEmail: string;
  date: Date;
  subject: string;
  additions: number;
  deletions: number;
}[] {
  const commits: {
    authorEmail: string;
    date: Date;
    subject: string;
    additions: number;
    deletions: number;
  }[] = [];

  const blocks = rawOutput.split(COMMIT_DELIMITER).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    // First line: author_email
    // Second line: ISO date
    // Third line: commit subject
    // Remaining lines: numstat (additions \t deletions \t filename)
    const authorEmail = lines[0]?.trim();
    const dateStr = lines[1]?.trim();
    const subject = lines[2]?.trim() ?? "";

    if (!authorEmail || !dateStr) continue;

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;

    let additions = 0;
    let deletions = 0;

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      const parts = line.split("\t");
      // numstat format: additions \t deletions \t filename
      // Binary files show "-" for additions/deletions
      const a = Number.parseInt(parts[0] ?? "", 10);
      const d = Number.parseInt(parts[1] ?? "", 10);
      if (!Number.isNaN(a)) additions += a;
      if (!Number.isNaN(d)) deletions += d;
    }

    commits.push({ authorEmail: authorEmail.toLowerCase(), date, subject, additions, deletions });
  }

  return commits;
}

function weekOfSeconds(date: Date): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Start of week (Sunday)
  return Math.floor(d.getTime() / 1000);
}

function buildCommitData(
  commits: { authorEmail: string; date: Date; additions: number; deletions: number }[],
  emailToUsername: Map<string, string>,
): ContributorCommitData[] {
  // Group commits by resolved username
  const byUser = new Map<
    string,
    {
      totalCommits: number;
      additions: number;
      deletions: number;
      weeks: Map<number, { additions: number; deletions: number; commits: number }>;
    }
  >();

  let matched = 0;
  let unmatched = 0;

  for (const commit of commits) {
    const username = emailToUsername.get(commit.authorEmail);
    if (!username) {
      unmatched++;
      continue;
    }
    matched++;

    let userData = byUser.get(username);
    if (!userData) {
      userData = { totalCommits: 0, additions: 0, deletions: 0, weeks: new Map() };
      byUser.set(username, userData);
    }

    userData.totalCommits++;
    userData.additions += commit.additions;
    userData.deletions += commit.deletions;

    const week = weekOfSeconds(commit.date);
    const weekData = userData.weeks.get(week);
    if (weekData) {
      weekData.additions += commit.additions;
      weekData.deletions += commit.deletions;
      weekData.commits++;
    } else {
      userData.weeks.set(week, {
        additions: commit.additions,
        deletions: commit.deletions,
        commits: 1,
      });
    }
  }

  console.log(`  Matched ${matched} commits, skipped ${unmatched} unmatched`);

  const result: ContributorCommitData[] = [];
  for (const [username, data] of byUser) {
    const weeklyData = Array.from(data.weeks.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, w]) => ({
        week,
        additions: w.additions,
        deletions: w.deletions,
        commits: w.commits,
      }));

    result.push({
      username,
      totalCommits: data.totalCommits,
      additions: data.additions,
      deletions: data.deletions,
      weeklyData,
    });
  }

  return result;
}

async function main() {
  const projectIdArg = process.argv[2];
  const repoPath = process.argv[3];
  const branch = process.argv[4]; // optional: e.g. "development", "main"

  if (!projectIdArg || !repoPath) {
    printUsage();
    process.exit(1);
  }

  const projectId: string = projectIdArg;

  // 1. Verify project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) {
    console.error(`Project not found: ${projectId}`);
    process.exit(1);
  }

  console.log(`Syncing stats for project: ${project.name} (${project.id})`);

  // 2. Run git log
  const gitRef = branch ? `origin/${branch}` : "";
  const branchArg = gitRef ? ` ${gitRef}` : "";
  if (branch) {
    console.log(`Fetching latest for branch: ${branch}...`);
    execSync(`git -C "${repoPath}" fetch origin ${branch}`, { encoding: "utf-8" });
  }
  console.log(`Running git log on ${repoPath}${branchArg}...`);
  const gitLogOutput = execSync(
    `git -C "${repoPath}" log${branchArg} --format="${COMMIT_DELIMITER}%n%ae%n%aI%n%s" --numstat`,
    { encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 },
  );

  const commits = parseGitLog(gitLogOutput);
  console.log(`  Parsed ${commits.length} total commits`);

  if (commits.length === 0) {
    console.log("No commits found. Check the repo path.");
    process.exit(1);
  }

  // 3. Get team members and build email → username mapping
  const teamMembers = await db.teamMember.findMany({
    where: { projectId },
    include: {
      person: {
        select: {
          email: true,
          emailAliases: true,
          gitlabUsername: true,
          githubUsername: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log(`  Found ${teamMembers.length} team members`);

  // Build email → username map
  // Priority: gitlabUsername > githubUsername > email (as fallback key)
  const emailToUsername = new Map<string, string>();
  const teamUsernames = new Set<string>();

  for (const tm of teamMembers) {
    const username = tm.person.gitlabUsername ?? tm.person.githubUsername ?? tm.person.email;
    emailToUsername.set(tm.person.email.toLowerCase(), username);
    for (const alias of tm.person.emailAliases) {
      emailToUsername.set(alias.toLowerCase(), username);
    }
    teamUsernames.add(username);
  }

  // Show the mapping for debugging
  console.log("  Email → Username mapping:");
  for (const [email, username] of emailToUsername) {
    console.log(`    ${email} → ${username}`);
  }

  // Also show unique commit author emails for manual matching
  const commitEmails = new Set(commits.map((c) => c.authorEmail));
  const unmatchedEmails = new Set<string>();
  for (const email of commitEmails) {
    if (!emailToUsername.has(email)) {
      unmatchedEmails.add(email);
    }
  }
  if (unmatchedEmails.size > 0) {
    console.log("\n  Unmatched commit author emails (not in team members):");
    for (const email of unmatchedEmails) {
      const count = commits.filter((c) => c.authorEmail === email).length;
      console.log(`    ${email} (${count} commits)`);
    }
    console.log("  Tip: Update the Person's email or gitlabUsername in the app to match these.\n");
  }

  // 4. Parse merge commits to extract PR/MR data
  console.log("Parsing merge commits for PR/MR data...");
  const mergeLogOutput = execSync(
    `git -C "${repoPath}" log${branchArg} --merges --format="${COMMIT_DELIMITER}%n%ae%n%aI%n%s" --first-parent`,
    { encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 },
  );
  const mergeCommits = parseGitLog(mergeLogOutput);
  console.log(`  Found ${mergeCommits.length} merge commits`);

  // Build PRData from merge commits (each merge commit ≈ 1 merged MR)
  const prData: import("../lib/github").PRData[] = [];
  for (const mc of mergeCommits) {
    const username = emailToUsername.get(mc.authorEmail);
    if (!username) continue;
    // Extract a cleaner title from merge commit message
    // GitLab format: "Merge branch 'feature/xyz' into 'main'" or just the MR title
    const title = mc.subject
      .replace(/^Merge branch '([^']+)' into '[^']+'$/, "$1")
      .replace(/^Merge remote-tracking branch '([^']+)'.*$/, "$1");
    prData.push({
      title: mc.subject,
      url: "",
      author: username,
      headRefName: title,
      state: "MERGED" as const,
      merged: true,
      mergedAt: mc.date.toISOString(),
      createdAt: mc.date.toISOString(),
      reviews: [],
    });
  }
  console.log(`  Matched ${prData.length} merge commits to team members`);

  // 5. Build ContributorCommitData from parsed git log
  const commitData = buildCommitData(commits, emailToUsername);

  if (commitData.length === 0) {
    console.error("No commits matched any team members. Check email mappings above.");
    process.exit(1);
  }

  console.log(`  Contributors matched: ${commitData.map((c) => c.username).join(", ")}`);

  // 6. Aggregate using the same logic as GitHub sync — now with PR data!
  const { allTime, ytd } = aggregateStats(commitData, prData);

  function toRecord(s: (typeof allTime)[number], period: StatsPeriod) {
    return {
      projectId,
      githubUsername: s.githubUsername,
      period,
      commits: s.commits,
      prsOpened: s.prsOpened,
      prsMerged: s.prsMerged,
      reviewsDone: s.reviewsDone,
      additions: s.additions,
      deletions: s.deletions,
      avgWeeklyCommits: s.avgWeeklyCommits,
      recentWeeklyCommits: s.recentWeeklyCommits,
      trend: s.trend,
      avgWeeklyReviews: s.avgWeeklyReviews,
      recentWeeklyReviews: s.recentWeeklyReviews,
      reviewTrend: s.reviewTrend,
    };
  }

  const records = [
    ...allTime.map((s) => toRecord(s, "all_time")),
    ...ytd.map((s) => toRecord(s, "ytd")),
  ];

  // 6. Write to DB
  console.log(`\nWriting ${records.length} stat records to database...`);

  await db.$transaction(async (tx) => {
    await tx.contributorStats.deleteMany({ where: { projectId } });
    if (records.length > 0) {
      await tx.contributorStats.createMany({ data: records });
    }
  });

  // Store merge entries for the merge digest (batch insert, skip duplicates)
  console.log("Storing merge entries...");
  const mergeData = commits
    .filter((c) => emailToUsername.has(c.authorEmail) && c.subject)
    .map((c) => ({
      projectId,
      title: c.subject,
      authorUsername: emailToUsername.get(c.authorEmail) as string,
      mergedAt: c.date,
    }));

  const BATCH_SIZE = 500;
  let mergeEntriesStored = 0;
  for (let i = 0; i < mergeData.length; i += BATCH_SIZE) {
    const batch = mergeData.slice(i, i + BATCH_SIZE);
    const result = await db.mergeEntry.createMany({
      data: batch,
      skipDuplicates: true,
    });
    mergeEntriesStored += result.count;
    console.log(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.count} of ${batch.length}`,
    );
  }
  console.log(`  Stored ${mergeEntriesStored} merge entries`);

  // Update sync record
  await db.gitHubSync.upsert({
    where: { projectId },
    create: { projectId, syncStatus: "idle", lastSyncAt: new Date() },
    update: { syncStatus: "idle", lastSyncAt: new Date(), syncError: null },
  });

  console.log("Done! Stats summary:");
  for (const s of allTime) {
    console.log(
      `  ${s.githubUsername}: ${s.commits} commits, +${s.additions}/-${s.deletions}, trend: ${s.trend}`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
