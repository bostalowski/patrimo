#!/usr/bin/env node
// Informational duplication signal for `make gauntlet` (CONSTRAINTS §26/§27).
// Crude, deliberately: flags a 6+ consecutive non-blank-line block shared
// verbatim between two DIFFERENT changed files. Never fails the gate —
// the real judgment call on duplication is the /clean-code skill in the
// Checker's review (docs/agent/scoring-rubric.md), not a heuristic script.
import { readFileSync } from "node:fs";

const WINDOW = 6;

function blocksOf(file) {
  const lines = readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const blocks = new Map(); // normalized block text -> starting line index (1-based, approximate)
  for (let i = 0; i + WINDOW <= lines.length; i++) {
    const block = lines.slice(i, i + WINDOW).join("\n");
    if (!blocks.has(block)) blocks.set(block, i + 1);
  }
  return blocks;
}

const files = process.argv.slice(2).filter(Boolean);
if (files.length < 2) {
  console.log("  fewer than 2 changed files to compare — nothing to check");
  process.exit(0);
}

const perFile = new Map();
for (const f of files) {
  try {
    perFile.set(f, blocksOf(f));
  } catch {
    // unreadable/deleted file — skip
  }
}

let found = 0;
const fileList = [...perFile.keys()];
for (let i = 0; i < fileList.length; i++) {
  for (let j = i + 1; j < fileList.length; j++) {
    const a = perFile.get(fileList[i]);
    const b = perFile.get(fileList[j]);
    for (const [block, lineA] of a) {
      if (b.has(block)) {
        found++;
        const lineB = b.get(block);
        console.log(
          `  duplicate ${WINDOW}+ line block: ${fileList[i]}:${lineA} <-> ${fileList[j]}:${lineB}`,
        );
      }
    }
  }
}

if (found === 0) {
  console.log("  no duplicate blocks found across changed files (informational heuristic)");
} else {
  console.log(`  ${found} duplicate block(s) found — informational only, does not fail the gate`);
}
process.exit(0);
