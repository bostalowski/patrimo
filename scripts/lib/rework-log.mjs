#!/usr/bin/env node
/**
 * Rework-log helpers (ADR 0026 D8).
 *
 * Commands:
 *   stamp   — upsert this branch's row (Date, Slug, Feature, Touched, Reworked?=no)
 *             Touched = filtered paths from git diff vs base
 *   check-own — exit 1 if current slug has no row or empty Touched
 *   check-overlap — exit 1 if current diff overlaps an unreworked row
 *                   (Date within 30 days, Reworked?=no, other slug) unless
 *                   those rows are already marked yes
 *
 * Env:
 *   FEATURE_FLOW_ROOT — repo root (default: cwd)
 *   FEATURE_FLOW_BASE — diff base (default: origin/main)
 *   REWORK_SLUG — override branch slug
 *   REWORK_FEATURE — override feature cell (else CONTRACT title / slug)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.env.FEATURE_FLOW_ROOT || process.cwd();
const LOG = path.join(ROOT, "docs/agent/rework-log.md");
const WINDOW_DAYS = 30;

const HEADER =
  "| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |";
const SEP = "|---|---|---|---|---|";

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function branchSlug(branch) {
  return branch
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function currentSlug() {
  if (process.env.REWORK_SLUG) return process.env.REWORK_SLUG;
  let branch = "";
  try {
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    branch = "HEAD";
  }
  if (branch === "HEAD") {
    branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "HEAD";
  }
  return branchSlug(branch);
}

function diffBase() {
  if (process.env.FEATURE_FLOW_BASE) return process.env.FEATURE_FLOW_BASE;
  try {
    git(["rev-parse", "--verify", "-q", "origin/main"]);
    return "origin/main";
  } catch {
    try {
      git(["rev-parse", "--verify", "-q", "main"]);
      return "main";
    } catch {
      return git(["rev-list", "--max-parents=0", "HEAD"]).split("\n").pop();
    }
  }
}

function changedFiles() {
  const base = diffBase();
  try {
    const out = git(["diff", "--name-only", `${base}...HEAD`]);
    return out ? out.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Paths worth fingerprinting a feature (drop noise that would false-positive). */
function fingerprintPaths(files) {
  const skip = [
    /^docs\/agent\/branches\//,
    /^docs\/agent\/runs\//,
    /\.test\.[tj]sx?$/,
    /\.spec\.[tj]sx?$/,
    /package-lock\.json$/,
    /^PROGRESS\.md$/,
  ];
  const out = [];
  for (const f of files) {
    if (skip.some((re) => re.test(f))) continue;
    out.push(f);
  }
  // Prefer specific modules; cap length for the table cell.
  out.sort();
  if (out.length <= 12) return out;
  // Keep a stable sample: first 12 lexicographic is OK for overlap checks
  // if we also keep all "src/" / "packages/core/src/" hits prioritized.
  const prioritized = out.filter(
    (f) =>
      f.startsWith("packages/core/src/") ||
      f.startsWith("src/") ||
      f.startsWith("scripts/") ||
      f.startsWith("mobile/"),
  );
  const rest = out.filter((f) => !prioritized.includes(f));
  return [...prioritized, ...rest].slice(0, 12);
}

function featureLabel(slug) {
  if (process.env.REWORK_FEATURE) return process.env.REWORK_FEATURE;
  const contract = path.join(ROOT, "docs/agent/branches", slug, "CONTRACT.md");
  if (existsSync(contract)) {
    const first = readFileSync(contract, "utf8").split("\n")[0] || "";
    const m = /^#\s*Contract:\s*(.+)$/i.exec(first);
    if (m) return m[1].trim().replace(/\|/g, "/");
  }
  return slug;
}

function parseRows(md) {
  const rows = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue;
    if (line.includes("Date merged")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    // Support old 4-col and new 5-col.
    if (cells.length === 4) {
      rows.push({
        date: cells[0],
        slug: cells[1],
        feature: cells[2],
        touched: [],
        reworked: cells[3].toLowerCase(),
        raw: line,
      });
    } else {
      rows.push({
        date: cells[0],
        slug: cells[1],
        feature: cells[2],
        touched: cells[3].split(/\s+/).filter(Boolean),
        reworked: cells[4].toLowerCase(),
        raw: line,
      });
    }
  }
  return rows;
}

function formatRow(row) {
  const touched = (row.touched || []).join(" ") || "—";
  const reworked = row.reworked.startsWith("yes") ? row.reworked : "no";
  return `| ${row.date} | ${row.slug} | ${row.feature} | ${touched} | ${reworked} |`;
}

function ensureLogSkeleton(md) {
  if (md.includes("| Touched |")) return md;
  // Migrate header if old format.
  let next = md;
  next = next.replace(
    /\| Date merged \| Slug \| Feature \| Reworked\?[^|]*\|/,
    HEADER,
  );
  next = next.replace(/\|---\|---\|---\|---\|/, SEP);
  return next;
}

function writeRows(md, rows) {
  const lines = ensureLogSkeleton(md).split("\n");
  const out = [];
  let inTable = false;
  let tableDone = false;
  for (const line of lines) {
    if (line.startsWith("| Date merged |")) {
      out.push(HEADER);
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|---")) {
      out.push(SEP);
      continue;
    }
    if (inTable && line.startsWith("|")) {
      // skip old body; rewrite after
      continue;
    }
    if (inTable && !line.startsWith("|")) {
      inTable = false;
      tableDone = true;
      for (const r of rows) out.push(formatRow(r));
      out.push(line);
      continue;
    }
    out.push(line);
  }
  if (!tableDone) {
    for (const r of rows) out.push(formatRow(r));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

function daysBetween(isoDate, today = new Date()) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return Infinity;
  return (today.getTime() - d.getTime()) / (86400 * 1000);
}

function pathOverlap(touched, changed) {
  const hits = [];
  for (const t of touched) {
    if (!t || t === "—") continue;
    for (const c of changed) {
      if (c === t || c.startsWith(`${t}/`) || t.startsWith(`${c}/`)) {
        hits.push({ touched: t, changed: c });
      }
    }
  }
  return hits;
}

function cmdStamp() {
  const slug = currentSlug();
  const today = new Date().toISOString().slice(0, 10);
  const files = fingerprintPaths(changedFiles());
  if (!existsSync(LOG)) {
    mkdirSync(path.dirname(LOG), { recursive: true });
    writeFileSync(
      LOG,
      `# Rework log\n\n${HEADER}\n${SEP}\n`,
      "utf8",
    );
  }
  let md = readFileSync(LOG, "utf8");
  md = ensureLogSkeleton(md);
  const rows = parseRows(md);
  const feature = featureLabel(slug);
  const idx = rows.findIndex((r) => r.slug === slug);
  const row = {
    date: today,
    slug,
    feature,
    touched: files.length ? files : ["—"],
    reworked: "no",
  };
  if (idx >= 0) {
    // Preserve yes if already reworked; refresh touched/feature/date.
    row.reworked = rows[idx].reworked.startsWith("yes") ? rows[idx].reworked : "no";
    rows[idx] = row;
  } else {
    rows.push(row);
  }
  writeFileSync(LOG, writeRows(md, rows), "utf8");
  console.log(`rework-log: stamped ${slug} (${files.length} touched paths)`);
  for (const f of files) console.log(`  - ${f}`);
}

function cmdCheckOwn() {
  const slug = currentSlug();
  if (!existsSync(LOG)) {
    console.error(`rework-log: missing ${LOG}`);
    process.exit(1);
  }
  const rows = parseRows(readFileSync(LOG, "utf8"));
  const row = rows.find((r) => r.slug === slug);
  if (!row) {
    console.error(
      `rework-log: no row for ${slug} — run \`make rework-log-stamp\` (or append manually) in this PR`,
    );
    process.exit(1);
  }
  if (!row.touched.length || (row.touched.length === 1 && row.touched[0] === "—")) {
    console.error(
      `rework-log: row for ${slug} has empty Touched — run \`make rework-log-stamp\` so overlap detection can work`,
    );
    process.exit(1);
  }
  console.log(`rework-log: own row OK for ${slug} (${row.touched.length} paths)`);
}

function cmdCheckOverlap() {
  const slug = currentSlug();
  if (!existsSync(LOG)) {
    console.log("rework-log: no log file — skip overlap");
    return;
  }
  const rows = parseRows(readFileSync(LOG, "utf8"));
  const changed = changedFiles();
  if (!changed.length) {
    console.log("rework-log: no changed files vs base — skip overlap");
    return;
  }
  const offenders = [];
  for (const row of rows) {
    if (row.slug === slug) continue;
    if (row.reworked.startsWith("yes")) continue;
    if (daysBetween(row.date) > WINDOW_DAYS) continue;
    if (!row.touched.length || row.touched[0] === "—") continue;
    const hits = pathOverlap(row.touched, changed);
    if (hits.length) {
      offenders.push({ row, hits: hits.slice(0, 5) });
    }
  }
  if (!offenders.length) {
    console.log("rework-log: no unreworked overlap within 30 days");
    return;
  }
  console.error(
    "rework-log: FAIL — this diff overlaps recent unreworked feature(s).",
  );
  console.error(
    "If this PR is a follow-up fix, set Reworked? to `yes` (optionally `yes — PR #N`) on those rows in docs/agent/rework-log.md.",
  );
  for (const o of offenders) {
    console.error(
      `  - ${o.row.slug} (merged ${o.row.date}): e.g. ${o.hits.map((h) => h.changed).join(", ")}`,
    );
  }
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === "stamp") cmdStamp();
else if (cmd === "check-own") cmdCheckOwn();
else if (cmd === "check-overlap") cmdCheckOverlap();
else {
  console.error("Usage: rework-log.mjs <stamp|check-own|check-overlap>");
  process.exit(2);
}
