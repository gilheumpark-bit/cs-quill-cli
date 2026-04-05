import fs from "node:fs/promises";
import path from "node:path";

export function resolveWorkspace(p) {
  return path.resolve(p ?? process.cwd());
}

export function isInsideWorkspace(root, full) {
  const rel = path.relative(root, full);
  if (rel === "") return true;
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function safeJoin(root, rel) {
  const clean = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.resolve(root, clean);
  if (!isInsideWorkspace(root, full)) throw new Error("path escapes workspace");
  return full;
}

export async function ensureDir(root) {
  await fs.access(root);
  const st = await fs.stat(root);
  if (!st.isDirectory()) throw new Error("not a directory");
}

export async function readPackageJson(root) {
  try {
    const raw = await fs.readFile(path.join(root, "package.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
