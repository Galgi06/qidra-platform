import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const changelogPath = path.join(repoRoot, "CHANGELOG.md");
const sinceArg = process.argv[2] || "24 hours ago";
const reportLabel = process.argv[2] ? `since ${process.argv[2]}` : "for the last 24 hours";

const gitLog = runGitLog(sinceArg);
const changelogEntries = readRecentChangelogEntries(changelogPath, gitLog.cutoffDate);

printReport({
  changelogEntries,
  commits: gitLog.commits,
  reportLabel
});

function runGitLog(since) {
  const result = spawnSync(
    "git",
    ["log", `--since=${since}`, "--date=iso-strict", "--pretty=format:%H%x09%ad%x09%an%x09%s"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  if (result.status !== 0) {
    fail(result.stderr || "Unable to read git history.");
  }

  const commits = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, date, author, subject] = line.split("\t");
      return { hash, date, author, subject };
    });

  return {
    commits,
    cutoffDate: isoDateDaysAgo(1)
  };
}

function readRecentChangelogEntries(filePath, cutoffDate) {
  let content = "";

  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const lines = content.split("\n");
  const entries = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^## \[(.+?)\] - (\d{4}-\d{2}-\d{2})$/);

    if (heading) {
      if (current) {
        entries.push(current);
      }

      current = {
        version: heading[1],
        date: heading[2],
        lines: []
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries.filter((entry) => entry.date >= cutoffDate);
}

function printReport({ commits, changelogEntries, reportLabel }) {
  console.log(`Qidra change report ${reportLabel}`);
  console.log("");

  console.log("Git commits");
  if (!commits.length) {
    console.log("- No commits found.");
  } else {
    for (const commit of commits) {
      console.log(`- ${commit.date} | ${commit.author} | ${commit.subject} | ${commit.hash.slice(0, 8)}`);
    }
  }

  console.log("");
  console.log("Changelog entries");
  if (!changelogEntries.length) {
    console.log("- No changelog entries found.");
    return;
  }

  for (const entry of changelogEntries) {
    console.log(`- [${entry.version}] ${entry.date}`);
    const body = entry.lines
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    for (const line of body) {
      console.log(`  ${line}`);
    }
  }
}

function isoDateDaysAgo(days) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - days);
  return now.toISOString().slice(0, 10);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
