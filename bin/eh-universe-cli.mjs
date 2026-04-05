#!/usr/bin/env node
import { Command } from "commander";
import { resolveWorkspace, ensureDir, readPackageJson } from "../lib/workspace.mjs";
import { startRepl } from "../lib/repl.mjs";
import { runPanel } from "../lib/handlers.mjs";
import { PANEL_IDS, isValidPanelId } from "../lib/panels.mjs";
import { searchWorkspace } from "../lib/search.mjs";
import { runInWorkspace } from "../lib/spawn.mjs";

function ws(program) {
  const o = program.opts();
  return resolveWorkspace(o.workspace);
}

const program = new Command();
program
  .name("eh-universe-cli")
  .description("EH Universe Code Studio — folder-scoped CLI (51 panels)")
  .option("-w, --workspace <dir>", "workspace root", process.cwd());

program
  .command("shell")
  .alias("i")
  .description("interactive REPL (ls, cat, write, run)")
  .action(async () => {
    const root = ws(program);
    await ensureDir(root);
    await startRepl(root);
  });

program
  .command("panel <id>")
  .description("run handler for a panel id (see `panels` list)")
  .option("-q, --query <text>", "query for search/symbol-style panels")
  .action(async (id, opts) => {
    const root = ws(program);
    await ensureDir(root);
    if (!isValidPanelId(id)) {
      console.error(`unknown panel id: ${id}\nvalid: ${PANEL_IDS.join(", ")}`);
      process.exit(1);
    }
    console.log(await runPanel(id, root, { query: opts.query }));
  });

program
  .command("panels")
  .description("list all panel ids")
  .option("--json", "JSON array")
  .action((opts) => {
    if (opts.json) console.log(JSON.stringify(PANEL_IDS, null, 2));
    else console.log(PANEL_IDS.join("\n"));
  });

program
  .command("search <query>")
  .description("search files under workspace (rg or fallback walk)")
  .action(async (query) => {
    const root = ws(program);
    await ensureDir(root);
    console.log(await searchWorkspace(root, query));
  });

program
  .command("status")
  .description("workspace + package.json + git summary")
  .action(async () => {
    const root = ws(program);
    await ensureDir(root);
    const pkg = await readPackageJson(root);
    const git = await runInWorkspace(root, "git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    console.log(`workspace: ${root}`);
    console.log(`package: ${pkg?.name ?? "(no package.json)"}@${pkg?.version ?? "-"}`);
    console.log(`git branch: ${git.code === 0 ? git.out.trim() : "(not git or error)"}`);
  });

program
  .command("git")
  .description("run git in workspace (passthrough)")
  .argument("[args...]", "git arguments")
  .allowUnknownOption()
  .action(async (args) => {
    const root = ws(program);
    await ensureDir(root);
    const { out, err, code } = await runInWorkspace(root, "git", args ?? []);
    process.stdout.write(out);
    process.stderr.write(err);
    process.exit(code ?? 0);
  });

program
  .command("npm")
  .description("run npm in workspace (passthrough)")
  .argument("[args...]", "npm arguments")
  .allowUnknownOption()
  .action(async (args) => {
    const root = ws(program);
    await ensureDir(root);
    const { out, err, code } = await runInWorkspace(root, "npm", args ?? []);
    process.stdout.write(out);
    process.stderr.write(err);
    process.exit(code ?? 0);
  });

program
  .command("run-all")
  .description("invoke every panel once (smoke; may be slow)")
  .action(async () => {
    const root = ws(program);
    await ensureDir(root);
    for (const id of PANEL_IDS) {
      console.log(`\n### ${id} ###`);
      try {
        console.log(await runPanel(id, root, { query: "test" }));
      } catch (e) {
        console.error(String(e?.message ?? e));
      }
    }
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
