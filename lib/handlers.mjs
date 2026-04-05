import fs from "node:fs/promises";
import path from "node:path";
import { readPackageJson } from "./workspace.mjs";
import { runInWorkspace } from "./spawn.mjs";
import { searchWorkspace } from "./search.mjs";

function stub(labelKo, hint) {
  return `[stub] ${labelKo}\n${hint}\n(전체 UI는 VS Code 확장 Code Studio에서 사용)`;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} id panel id
 * @param {string} root workspace root
 * @param {{ query?: string }} opts
 */
export async function runPanel(id, root, opts = {}) {
  const pkg = await readPackageJson(root);
  const q = opts.query ?? "TODO";

  switch (id) {
    case "chat":
      return stub("AI 채팅", "환경변수로 API 키를 설정한 뒤 별도 TTY 클라이언트를 연결하거나 확장 웹뷰를 사용하세요.");
    case "quick-verify": {
      if (!pkg?.scripts?.test) return "[quick-verify] package.json에 scripts.test 없음 — 수동 검증만 표시";
      const { out, err, code } = await runInWorkspace(root, "npm", ["run", "test", "--if-present"]);
      return `--- npm test (exit ${code}) ---\n${out}${err}`;
    }
    case "project-spec":
      return stub("이지모드(명세서)", "프로젝트 README.md / docs/*.md 목록:\n" + (await listDocs(root)));
    case "search":
      return await searchWorkspace(root, q);
    case "outline":
      return await outlineTs(root);
    case "preview":
      return stub("실시간 프리뷰", "로컬 서버가 있다면: npm run dev / preview 스크립트를 터미널에서 실행.");
    case "templates":
      return stub("템플릿 갤러리", "템플릿 디렉터리가 없으면 확장 UI 사용.");
    case "diff-editor":
      return stub("비교 편집기", "git diff --stat:\n" + (await gitDiffStat(root)));
    case "canvas":
      return stub("캔버스", "그래픽 캔버스는 확장 웹뷰 전용.");
    case "symbol-palette":
      return await searchWorkspace(root, "export function", 40);
    case "recent-files":
      return await recentGitFiles(root);
    case "code-actions":
      return stub("코드 액션", "에디터 연동 필요 — CLI에서는 `search`로 패턴 검색.");
    case "terminal-panel":
    case "multi-terminal":
      return `이 CLI의 \`shell\` 서브커맨드로 동일 폴더에서 터미널 작업을 하세요.\nWorkspace: ${root}`;
    case "composer":
    case "autopilot":
    case "agents":
    case "creator":
    case "ai-hub":
    case "ai-workspace":
    case "model-switcher":
      return stub(id, "AI 멀티파일/에이전트 — 확장 또는 headless API 패키지 분리 후 연동.");
    case "pipeline": {
      const scripts = pkg?.scripts ? Object.keys(pkg.scripts).join(", ") : "(none)";
      return `package.json scripts: ${scripts}\n기본 빌드 시도: npm run build --if-present\n` + (await npmRun(root, "build"));
    }
    case "bugs": {
      const a = await searchWorkspace(root, "TODO", 35);
      const b = await searchWorkspace(root, "FIXME", 35);
      return "--- TODO ---\n" + a + "\n--- FIXME ---\n" + b;
    }
    case "review":
      return stub("리뷰 센터", "git log -3:\n" + (await gitLog(root, 3)));
    case "evaluation":
      return await countSourceLines(root);
    case "progress":
      return stub("진행 대시보드", "git shortlog -sn:\n" + (await gitShortlog(root)));
    case "network-inspector":
      return stub("네트워크 검사기", "브라우저 DevTools 또는 확장 프리뷰 패널.");
    case "merge-conflict":
      return await gitGrepConflict(root);
    case "git":
      return (await runInWorkspace(root, "git", ["status", "-sb"])).out || "(not a git repo or git missing)";
    case "deploy":
      return stub("배포", "CI/CD 또는 `vercel` / `npm run deploy` 스크립트 확인.");
    case "git-graph":
      return (await runInWorkspace(root, "git", ["log", "--graph", "--oneline", "-n", "15"])).out || "";
    case "packages":
      return pkg ? `name: ${pkg.name}\ndeps: ${Object.keys(pkg.dependencies || {}).length} devDeps: ${Object.keys(pkg.devDependencies || {}).length}` : "no package.json";
    case "database":
      return stub("데이터베이스", "DB URL은 환경변수 / .env — CLI는 연결하지 않음.");
    case "collab":
      return stub("협업", "Git remote:\n" + (await gitRemote(root)));
    case "onboarding":
      return `시작: 1) npm install 2) npm run compile 3) 확장 F5\nREADME 존재: ${await exists(path.join(root, "README.md"))}`;
    case "project-switcher":
      return `현재 워크스페이스: ${root}`;
    case "keybindings":
      return stub("단축키", "VS Code 키보드 단축키 설정.");
    case "settings-panel":
      return stub("설정 패널", "확장 설정 JSON 또는 웹뷰.");
    case "api-config":
      return stub("API 설정", "환경변수 OPENAI_API_KEY 등 — 확장 시크릿 스토리지와 별개.");
    case "audit": {
      await sleep(300);
      return "[Migration Audit] CLI 더미 감사 완료 — 치명적 이슈 없음 (테스트 응답)";
    }
    case "multi-diff":
      return (await runInWorkspace(root, "git", ["diff", "--stat"])).out || stub("멀티파일 비교", "git diff 없음");
    case "debugger":
      return stub("디버거", "Node: node --inspect-brk … 또는 VS Code launch.json");
    case "naming-dict":
      return await extractIdentifiers(root);
    case "dep-graph":
      return pkg ? JSON.stringify({ dep: Object.keys(pkg.dependencies || {}), dev: Object.keys(pkg.devDependencies || {}) }, null, 2) : "{}";
    case "review-board":
      return stub("리뷰 보드", "ADR/리뷰 문서: " + (await listDocs(root)));
    case "module-profile":
      return await listTopDirs(root);
    case "cognitive-load":
      return await countSourceLines(root);
    case "adr":
      return (await findAdr(root)) || stub("아키텍처 결정", "docs/adr 없음");
    case "code-rhythm":
      return (await gitShortlog(root)) || "";
    case "migration-audit":
      await sleep(400);
      return "[Migration Audit] 파일 내 1:1 로직 손실이 발견되지 않았습니다. (CLI 테스트 응답)";
    case "snippet-market":
      return stub("스니펫 마켓", "로컬 .vscode/*.code-snippets 없으면 확장 사용.");
    default:
      return stub(id, "알 수 없는 패널 id");
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return "yes";
  } catch {
    return "no";
  }
}

async function npmRun(root, script) {
  const { out, err, code } = await runInWorkspace(root, "npm", ["run", script, "--if-present"]);
  return `[exit ${code}]\n${out}${err}`;
}

async function gitDiffStat(root) {
  const r = await runInWorkspace(root, "git", ["diff", "--stat"]);
  return r.out || r.err || "(no diff)";
}

async function gitLog(root, n) {
  const r = await runInWorkspace(root, "git", ["log", "-n", String(n), "--oneline"]);
  return r.out || "";
}

async function gitShortlog(root) {
  const r = await runInWorkspace(root, "git", ["shortlog", "-sn", "-n", "10"]);
  return r.out || "";
}

async function gitRemote(root) {
  const r = await runInWorkspace(root, "git", ["remote", "-v"]);
  return r.out || "(no remote)";
}

async function gitGrepConflict(root) {
  const r = await runInWorkspace(root, "git", ["diff", "--name-only", "--diff-filter=U"]);
  if (r.out?.trim()) return "unmerged:\n" + r.out;
  return searchWorkspace(root, "<<<<<<<", 20);
}

async function recentGitFiles(root) {
  const r = await runInWorkspace(root, "git", ["log", "-n", "8", "--name-only", "--pretty=format:"]);
  return r.out?.trim() || "(no git history)";
}

async function listDocs(root) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const md = entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name);
    return md.slice(0, 15).join(", ") || "(no md in root)";
  } catch {
    return "";
  }
}

async function outlineTs(root) {
  return searchWorkspace(root, "^export (async )?function", 35);
}

async function countSourceLines(root) {
  let n = 0;
  let files = 0;
  async function walk(d, depth) {
    if (depth > 10) return;
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full, depth + 1);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
        try {
          const c = await fs.readFile(full, "utf8");
          n += c.split(/\r?\n/).length;
          files++;
        } catch {
          /* */
        }
      }
    }
  }
  await walk(root, 0);
  return `대략 ${files}개 소스 파일, ~${n} 줄 (node_modules/dist 제외)`;
}

async function listTopDirs(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
    .map((e) => e.name)
    .join("\n");
}

async function extractIdentifiers(root) {
  const sample = await searchWorkspace(root, "^(export )?(async )?function \\w+", 25);
  return "이름 후보 (정규식 샘플):\n" + sample;
}

async function findAdr(root) {
  const adr = path.join(root, "docs", "adr");
  try {
    const files = await fs.readdir(adr);
    return files.filter((f) => f.endsWith(".md")).join(", ");
  } catch {
    return "";
  }
}
