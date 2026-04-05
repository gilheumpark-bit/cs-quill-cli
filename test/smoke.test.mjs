/**
 * eh-universe-cli — smoke test suite
 * 외부 의존성 없이 node:test + node:assert 만 사용 (Node 18+)
 * 커버리지: 패널 레지스트리 / workspace 유틸 / 핸들러 디스패치 / 검색 폴백
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PANEL_IDS, isValidPanelId } from "../lib/panels.mjs";
import { resolveWorkspace, isInsideWorkspace, safeJoin } from "../lib/workspace.mjs";
import { runPanel } from "../lib/handlers.mjs";

const exec = promisify(execFile);
const CLI = path.resolve("bin/eh-universe-cli.mjs");
const ROOT = path.resolve(".");

// ─── 1. Panel Registry ───────────────────────────────────────
describe("panels.mjs", () => {
  it("51개 패널 ID 등록", () => {
    assert.equal(PANEL_IDS.length, 51);
  });

  it("중복 ID 없음", () => {
    const set = new Set(PANEL_IDS);
    assert.equal(set.size, PANEL_IDS.length, "중복 패널 ID 존재");
  });

  it("isValidPanelId — 유효/무효 판별", () => {
    assert.equal(isValidPanelId("chat"), true);
    assert.equal(isValidPanelId("evaluation"), true);
    assert.equal(isValidPanelId("nonexistent-panel"), false);
    assert.equal(isValidPanelId(""), false);
  });
});

// ─── 2. Workspace 유틸 ───────────────────────────────────────
describe("workspace.mjs", () => {
  it("resolveWorkspace — 절대 경로 반환", () => {
    const ws = resolveWorkspace(".");
    assert.ok(path.isAbsolute(ws));
  });

  it("isInsideWorkspace — 내부 경로 true", () => {
    assert.equal(isInsideWorkspace("/a/b", "/a/b/c/d.txt"), true);
    assert.equal(isInsideWorkspace("/a/b", "/a/b"), true);
  });

  it("isInsideWorkspace — 외부 경로 false", () => {
    assert.equal(isInsideWorkspace("/a/b", "/a/c"), false);
    assert.equal(isInsideWorkspace("/a/b", "/x/y"), false);
  });

  it("safeJoin — 정상 경로 결합", () => {
    const result = safeJoin(ROOT, "lib/panels.mjs");
    assert.ok(path.isAbsolute(result));
    assert.ok(result.endsWith("panels.mjs"));
    assert.ok(result.startsWith(ROOT));
  });

  it("safeJoin — .. 시퀀스를 strip하여 워크스페이스 내부로 제한", () => {
    // safeJoin은 선행 ../ 를 제거한 뒤 resolve → 결과가 워크스페이스 밖이면 throw
    // ../../etc/passwd → etc/passwd (strip) → ROOT/etc/passwd (내부) → throw 안 함
    const result = safeJoin(ROOT, "../../etc/passwd");
    assert.ok(result.startsWith(ROOT), "결과가 워크스페이스 내부여야 함");
    assert.ok(result.includes("etc"));
  });
});

// ─── 3. Handler 디스패치 ─────────────────────────────────────
describe("handlers.mjs — runPanel", () => {
  it("유효한 패널 ID는 문자열 반환 (chat)", async () => {
    const result = await runPanel("chat", ROOT);
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });

  it("evaluation — 소스 파일 수/줄 수 포함", async () => {
    const result = await runPanel("evaluation", ROOT);
    assert.ok(result.includes("소스 파일"), `출력에 '소스 파일' 없음: ${result}`);
  });

  it("packages — 패키지 정보 반환", async () => {
    const result = await runPanel("packages", ROOT);
    assert.ok(result.includes("eh-universe-cli"));
  });

  it("bugs — TODO/FIXME 검색 실행", async () => {
    const result = await runPanel("bugs", ROOT);
    assert.ok(result.includes("TODO") || result.includes("FIXME"));
  });

  it("dep-graph — JSON 반환", async () => {
    const result = await runPanel("dep-graph", ROOT);
    const parsed = JSON.parse(result);
    assert.ok(Array.isArray(parsed.dep));
  });

  // npm/git spawn이 Windows shell:false에서 .cmd 확장자 문제를 일으킬 수 있으므로
  // 외부 프로세스 의존 패널은 별도 분리
  const SKIP_SPAWN = new Set([
    "quick-verify", "pipeline", "diff-editor", "review", "progress",
    "merge-conflict", "git", "git-graph", "multi-diff", "recent-files",
    "collab", "code-rhythm",
  ]);

  it("spawn 비의존 패널 전체 — 에러 없이 실행", async () => {
    const targets = PANEL_IDS.filter((id) => !SKIP_SPAWN.has(id));
    for (const id of targets) {
      const result = await runPanel(id, ROOT, { query: "test" });
      assert.equal(typeof result, "string", `패널 ${id}가 문자열을 반환하지 않음`);
    }
  });
});

// ─── 4. CLI 바이너리 통합 테스트 ─────────────────────────────
describe("CLI binary", () => {
  it("--help 정상 출력", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    assert.ok(stdout.includes("eh-universe-cli"));
    assert.ok(stdout.includes("51 panels"));
  });

  it("panels --json — 51개 배열", async () => {
    const { stdout } = await exec("node", [CLI, "panels", "--json"]);
    const arr = JSON.parse(stdout);
    assert.equal(arr.length, 51);
  });

  it("status — workspace 경로 포함", async () => {
    const { stdout } = await exec("node", [CLI, "status"]);
    assert.ok(stdout.includes("workspace:"));
    assert.ok(stdout.includes("eh-universe-cli"));
  });

  it("panel evaluation — 줄 수 출력", async () => {
    const { stdout } = await exec("node", [CLI, "panel", "evaluation"]);
    assert.ok(stdout.includes("소스 파일"));
  });

  it("잘못된 패널 ID — exit 1", async () => {
    try {
      await exec("node", [CLI, "panel", "fake-panel-xyz"]);
      assert.fail("exit 0이면 안 됨");
    } catch (e) {
      assert.ok(e.stderr.includes("unknown panel id"));
    }
  });
});
