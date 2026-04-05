/**
 * Interactive REPL (folder-scoped file + shell).
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { safeJoin } from "./workspace.mjs";

export async function startRepl(workspace) {
  function cmdLs(args) {
    return (async () => {
      const sub = args[0] ? safeJoin(workspace, args[0]) : workspace;
      const names = await fs.readdir(sub, { withFileTypes: true });
      const lines = names
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => `${d.isDirectory() ? "d" : "-"} ${d.name}`);
      return lines.length ? lines.join("\n") : "(empty)";
    })();
  }

  async function cmdCat(args) {
    if (!args[0]) return "usage: cat <relative-path>";
    const p = safeJoin(workspace, args[0]);
    return await fs.readFile(p, "utf8");
  }

  async function cmdWrite(args, body) {
    if (!args[0]) return "usage: write <relative-path> then lines, \".\" alone ends";
    const p = safeJoin(workspace, args[0]);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, body, "utf8");
    return `wrote ${args[0]} (${body.length} bytes)`;
  }

  async function cmdMkdir(args) {
    if (!args[0]) return "usage: mkdir <relative-path>";
    await fs.mkdir(safeJoin(workspace, args[0]), { recursive: true });
    return `ok ${args[0]}`;
  }

  function runShell(argvRest) {
    return new Promise((resolve, reject) => {
      const cmd = argvRest.join(" ");
      if (!cmd.trim()) {
        resolve("usage: run <command>");
        return;
      }
      const child = spawn(cmd, {
        cwd: workspace,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (c) => (out += c));
      child.stderr.on("data", (c) => (err += c));
      child.on("error", reject);
      child.on("close", (code) => {
        resolve([out, err].filter(Boolean).join("") + `\n[exit ${code}]`);
      });
    });
  }

  function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return { cmd: "", args: [] };
    const parts = [];
    let cur = "";
    let q = null;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (q) {
        if (c === q) q = null;
        else cur += c;
        continue;
      }
      if (c === '"' || c === "'") {
        q = c;
        continue;
      }
      if (/\s/.test(c)) {
        if (cur) {
          parts.push(cur);
          cur = "";
        }
      } else cur += c;
    }
    if (cur) parts.push(cur);
    const [cmd, ...args] = parts;
    return { cmd: cmd ?? "", args };
  }

  async function readWriteBody(rl) {
    const lines = [];
    while (true) {
      const line = await rl.question("");
      if (line === ".") break;
      lines.push(line);
    }
    return lines.join("\n");
  }

  const help = [
    "EH Universe CLI — interactive shell",
    "  help | pwd | ls [dir] | cat <file> | mkdir <dir>",
    "  write <file> — multiline, \".\" ends | run <shell>",
    "  quit | exit",
    "",
    `Workspace: ${workspace}`,
  ].join("\n");

  const rl = readline.createInterface({ input, output });
  console.log(help + "\n");

  while (true) {
    let line;
    try {
      line = await rl.question("> ");
    } catch {
      break;
    }
    const { cmd, args } = parseLine(line);
    const low = cmd.toLowerCase();
    try {
      if (!low || low === "exit" || low === "quit") break;
      if (low === "help" || low === "?") console.log(help);
      else if (low === "pwd") console.log(workspace);
      else if (low === "ls") console.log(await cmdLs(args));
      else if (low === "cat") console.log(await cmdCat(args));
      else if (low === "mkdir") console.log(await cmdMkdir(args));
      else if (low === "write") {
        const body = await readWriteBody(rl);
        console.log(await cmdWrite(args, body));
      } else if (low === "run") console.log(await runShell(args));
      else console.log('Unknown. Type "help".');
    } catch (e) {
      console.error(String(e?.message ?? e));
    }
  }
  rl.close();
  console.log("bye");
}
