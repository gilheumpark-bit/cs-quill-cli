import fs from "node:fs/promises";
import path from "node:path";
import { runInWorkspace } from "./spawn.mjs";

const SKIP = new Set(["node_modules", ".git", "dist", ".next", "coverage"]);

async function fallbackWalk(root, dir, query, maxHits, hits, depth) {
  if (hits.length >= maxHits || depth > 14) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const q = query.toLowerCase();
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await fallbackWalk(root, full, query, maxHits, hits, depth + 1);
      if (hits.length >= maxHits) break;
      continue;
    }
    if (e.name.length > 200) continue;
    try {
      const raw = await fs.readFile(full, "utf8");
      if (raw.length > 400_000) continue;
      const lower = raw.toLowerCase();
      if (!lower.includes(q)) continue;
      const lines = raw.split(/\r?\n/);
      const rel = path.relative(root, full);
      lines.forEach((line, i) => {
        if (hits.length >= maxHits) return;
        if (line.toLowerCase().includes(q)) {
          hits.push(`${rel}:${i + 1}:${line.slice(0, 200)}`);
        }
      });
    } catch {
      /* binary or error */
    }
  }
}

export async function searchWorkspace(root, query, maxHits = 80) {
  if (!query?.trim()) return "(empty query)";
  const { out, code } = await runInWorkspace(root, "rg", ["-n", "--glob", "!.git/*", "--glob", "!node_modules/*", query, "."]);
  if (code === 0 && out?.trim()) {
    const lines = out.trim().split("\n").filter(Boolean);
    return lines.slice(0, maxHits).join("\n") + (lines.length > maxHits ? `\n… (${lines.length} hits, truncated)` : "");
  }
  const hits = [];
  await fallbackWalk(root, root, query, maxHits, hits, 0);
  return hits.length
    ? hits.join("\n")
    : "(no matches; install ripgrep `rg` for faster search, or check query)";
}
